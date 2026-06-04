/** https://accounts.google.com/gsi/client — Google Identity Services (Sign in with Google button) */
export const GOOGLE_GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export function isGoogleGsiReady(): boolean {
  return typeof window !== "undefined" && !!window.google?.accounts?.id;
}

function waitUntilGsiReady(signal: { cancelled: boolean } | undefined, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isGoogleGsiReady()) {
      resolve();
      return;
    }
    const start = Date.now();
    const poll = window.setInterval(() => {
      if (signal?.cancelled) {
        window.clearInterval(poll);
        return;
      }
      if (isGoogleGsiReady()) {
        window.clearInterval(poll);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        window.clearInterval(poll);
        if (!signal?.cancelled) {
          reject(
            new Error(
              "Google Sign-In timed out. Check network/ad blockers, or use Continue with Google below."
            )
          );
        }
      }
    }, 50);
  });
}

function findGsiScriptTag(): HTMLScriptElement | null {
  return document.querySelector(`script[src="${GOOGLE_GSI_SCRIPT_SRC}"]`);
}

/** True when the tag finished fetching (success or failure). */
function isScriptFetchComplete(el: HTMLScriptElement): boolean {
  const legacy = (el as HTMLScriptElement & { complete?: boolean }).complete;
  return legacy === true || el.getAttribute("data-mx-gsi-state") === "loaded";
}

function removeFailedGsiScript(): void {
  const tag = findGsiScriptTag();
  if (tag && tag.getAttribute("data-mx-gsi-state") === "error") {
    tag.remove();
  }
}

function injectGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isGoogleGsiReady()) {
      resolve();
      return;
    }

    const existing = findGsiScriptTag();
    if (existing) {
      const state = existing.getAttribute("data-mx-gsi-state");
      if (state === "error") {
        existing.remove();
      } else if (state === "loaded" || isGoogleGsiReady()) {
        resolve();
        return;
      } else if (isScriptFetchComplete(existing)) {
        resolve();
        return;
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load Google script")),
          { once: true }
        );
        return;
      }
    }

    const script = document.createElement("script");
    script.src = GOOGLE_GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-mx-gsi-state", "loading");
    script.onload = () => {
      script.setAttribute("data-mx-gsi-state", "loaded");
      resolve();
    };
    script.onerror = () => {
      script.setAttribute("data-mx-gsi-state", "error");
      reject(new Error("Failed to load Google script"));
    };
    document.head.appendChild(script);
  });
}

let inflightLoad: Promise<void> | null = null;

/**
 * Loads GIS once per page (shared promise). Retries once if the script tag errors
 * (common with Strict Mode races, ad blockers briefly failing, or a stale tag).
 */
export function loadGoogleGsiScript(signal?: { cancelled: boolean }): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Sign-In is only available in the browser"));
  }
  if (isGoogleGsiReady()) {
    return Promise.resolve();
  }

  if (!inflightLoad) {
    inflightLoad = (async () => {
      try {
        await injectGsiScript();
        await waitUntilGsiReady(undefined, 20_000);
      } catch (firstErr) {
        removeFailedGsiScript();
        await new Promise((r) => setTimeout(r, 400));
        await injectGsiScript();
        await waitUntilGsiReady(undefined, 20_000);
        if (!isGoogleGsiReady()) throw firstErr;
      }
    })().finally(() => {
      inflightLoad = null;
    });
  }

  return inflightLoad.then(() => {
    if (signal?.cancelled) return Promise.resolve();
    if (!isGoogleGsiReady()) {
      return waitUntilGsiReady(signal, 20_000);
    }
    return Promise.resolve();
  });
}

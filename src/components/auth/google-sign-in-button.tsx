"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setOAuthCookiesClient } from "@/lib/oauth-auth";
import { toUserFacingAuthError } from "@/lib/user-facing-error";

const buttonClassName =
  "w-full h-10 border border-[#E2E8F0] bg-white rounded-lg text-[14px] font-medium text-slate-900 text-center hover:border-mentrixa-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none";

const GSI_SRC = "https://accounts.google.com/gsi/client";

/** Uses `/api/auth/oauth-next` instead of a Server Action (avoids Next 16 RSC/action parse errors). */
async function fetchPostOAuthRedirectWithRetry(): Promise<{ path: string } | { error: string }> {
  const waitMs = [0, 90, 180, 280];
  let lastErr = "Could not determine where to send you after sign-in. Please try again.";
  for (const ms of waitMs) {
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    try {
      const res = await fetch("/api/auth/oauth-next", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const raw = await res.text();
      let data: unknown;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        lastErr = "The server returned an invalid response. Please refresh and try again.";
        continue;
      }
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : `Request failed (${res.status})`;
        lastErr = msg;
        if (res.status >= 500) continue;
        return { error: msg };
      }
      if (!data || typeof data !== "object") {
        lastErr = "Could not read redirect from server.";
        continue;
      }
      if ("error" in data && typeof (data as { error: unknown }).error === "string") {
        return { error: (data as { error: string }).error };
      }
      if ("path" in data && typeof (data as { path: unknown }).path === "string") {
        const path = (data as { path: string }).path;
        if (path) return { path };
      }
      lastErr = "Could not determine where to send you after sign-in. Please try again.";
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return { error: lastErr };
}

function gsiReady(): boolean {
  return typeof window !== "undefined" && !!window.google?.accounts?.id;
}

/** Injects `gsi/client` if needed, then polls until `google.accounts.id` exists (fixes races + duplicate tags). */
function loadGsiScript(signal?: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    if (gsiReady()) {
      resolve();
      return;
    }

    if (!document.querySelector(`script[src="${GSI_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        if (!signal?.cancelled) reject(new Error("Failed to load Google script"));
      };
      document.head.appendChild(script);
    }

    const start = Date.now();
    const poll = window.setInterval(() => {
      if (signal?.cancelled) {
        window.clearInterval(poll);
        return;
      }
      if (gsiReady()) {
        window.clearInterval(poll);
        resolve();
        return;
      }
      if (Date.now() - start > 15000) {
        window.clearInterval(poll);
        if (!signal?.cancelled) {
          reject(
            new Error(
              "Google Sign-In timed out. Often caused by Content-Security-Policy blocking accounts.google.com — redeploy with latest middleware headers."
            )
          );
        }
      }
    }, 50);
  });
}

type Variant = "signin" | "signup";

/**
 * Preferred: Google Identity Services (`renderButton` on your page) + `signInWithIdToken`.
 * Does **not** use `signInWithOAuth`, so users are not sent through `*.supabase.co` for Google.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Web client ID — same as Supabase → Auth → Google).
 *
 * Fallback: Supabase OAuth redirect (shows Supabase host on Google’s screen) if client ID is missing.
 */
export function GoogleSignInButton({
  variant = "signin",
  /** Selected role on signup before Google — persisted via OAuth cookies for callback / GIS. */
  oauthRole,
  /**
   * Signup only: after Google ID token sign-in, run this instead of `/api/auth/oauth-next`
   * (e.g. send activation link + show “check your email” in the parent). Return `abort` if
   * the parent cleared the flow — caller will sign out the fresh Google session.
   */
  onSignupGoogleComplete,
}: {
  variant?: Variant;
  oauthRole?: "student" | "tutor";
  onSignupGoogleComplete?: (googleCredential: string) => Promise<"success" | "abort">;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gsiError, setGsiError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  /** GSI `initialize` runs once per page load — keep latest handlers via refs. */
  const onCredentialRef = useRef<(response: { credential?: string }) => void>(() => {});
  const onSignupGoogleCompleteRef = useRef(onSignupGoogleComplete);
  onSignupGoogleCompleteRef.current = onSignupGoogleComplete;

  async function signInWithSupabaseOAuth() {
    setBusy(true);
    setError(null);
    if (variant === "signup") {
      setOAuthCookiesClient({
        intent: "signup",
        signupRole: oauthRole ?? "student",
      });
    } else {
      setOAuthCookiesClient({ intent: "signin" });
    }
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(toUserFacingAuthError(oauthError));
      setBusy(false);
    }
  }

  const handleGoogleCredential = useCallback(
    async (response: { credential?: string }) => {
      const token = response.credential;
      if (!token) {
        setError("Google did not return a sign-in token. Try again.");
        return;
      }
      if (variant === "signup") {
        setOAuthCookiesClient({
          intent: "signup",
          signupRole: oauthRole ?? "student",
        });
      } else {
        setOAuthCookiesClient({ intent: "signin" });
      }
      setBusy(true);
      setError(null);
      try {
        // Signup: join + confirmation email BEFORE Supabase auth (avoids trigger-only row with no email).
        if (variant === "signup" && onSignupGoogleCompleteRef.current) {
          try {
            await onSignupGoogleCompleteRef.current(token);
          } catch (callbackErr) {
            console.error("[GoogleSignInButton] signup onboarding callback:", callbackErr);
            setError(toUserFacingAuthError(callbackErr));
            const supabase = createClient();
            await supabase.auth.signOut();
          }
          return;
        }

        const supabase = createClient();
        const { error: signError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token,
        });
        if (signError) {
          setError(toUserFacingAuthError(signError));
          return;
        }
        await supabase.auth.getSession();

        const next = await fetchPostOAuthRedirectWithRetry();
        if (!next || typeof next !== "object") {
          setError("Could not determine where to send you after sign-in. Please try again.");
          await supabase.auth.signOut();
          return;
        }
        if ("error" in next) {
          setError(next.error);
          await supabase.auth.signOut();
          return;
        }
        if (!("path" in next) || typeof next.path !== "string" || !next.path) {
          setError("Could not determine where to send you after sign-in. Please try again.");
          await supabase.auth.signOut();
          return;
        }
        if (next.path.startsWith("/auth/session-sync")) {
          window.location.assign(next.path);
          return;
        }
        router.push(next.path);
        router.refresh();
      } catch (err) {
        console.error("[GoogleSignInButton] sign-in failed:", err);
        setError(toUserFacingAuthError(err));
      } finally {
        setBusy(false);
      }
    },
    [variant, oauthRole, router],
  );

  onCredentialRef.current = (response) => {
    void handleGoogleCredential(response);
  };

  useEffect(() => {
    if (!clientId) return;

    const cancelledRef = { cancelled: false };
    let el: HTMLDivElement | null = null;

    const timer = window.setTimeout(() => {
      el = containerRef.current;
      if (!el || cancelledRef.cancelled) return;

      void (async () => {
        try {
          await loadGsiScript(cancelledRef);
          if (cancelledRef.cancelled || !containerRef.current || !window.google?.accounts?.id) {
            return;
          }
          const host = containerRef.current;
          host.innerHTML = "";
          const g = window as typeof window & { __mxGsiInitialized?: boolean };
          if (!g.__mxGsiInitialized) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              // Prefer classic button flow; FedCM + strict COOP has caused postMessage failures for some setups.
              use_fedcm_for_button: false,
              callback: (r) => {
                onCredentialRef.current(r);
              },
            });
            g.__mxGsiInitialized = true;
          }
          window.google.accounts.id.renderButton(host, {
            theme: "outline",
            size: "large",
            width: 384,
            text: variant === "signup" ? "signup_with" : "continue_with",
            locale: "en",
          });
        } catch (err) {
          if (!cancelledRef.cancelled) {
            console.error("[GoogleSignInButton] GSI init failed:", err);
            setGsiError(
              "Google Sign-In could not load. If this persists after refresh, contact support."
            );
          }
        }
      })();
    }, 0);

    const containerAtSetup = containerRef.current;
    return () => {
      cancelledRef.cancelled = true;
      window.clearTimeout(timer);
      if (el) el.innerHTML = "";
      else if (containerAtSetup) containerAtSetup.innerHTML = "";
    };
  }, [clientId, variant]);

  if (!clientId) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={signInWithSupabaseOAuth} disabled={busy} className={buttonClassName}>
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
        <p className="text-xs text-slate-600 leading-relaxed">
          To avoid the <code className="text-[11px] bg-slate-100 px-1 rounded">supabase.co</code> screen on
          Google, add{" "}
          <code className="text-[11px] bg-slate-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>{" "}
          (same Web Client ID as Supabase → Authentication → Google) and redeploy. Add{" "}
          <code className="text-[11px] bg-slate-100 px-1 rounded">{`{your origin}`}</code> under
          Authorized JavaScript origins in Google Cloud Console.
        </p>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div
        className={`w-full min-h-[44px] flex justify-center [&>div]:!w-full ${busy ? "opacity-60 pointer-events-none" : ""}`}
        ref={containerRef}
      />
      {busy ? <p className="text-center text-xs text-slate-500">Signing you in…</p> : null}
      {gsiError ? <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{gsiError}</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {gsiError ? (
        <button type="button" onClick={signInWithSupabaseOAuth} disabled={busy} className={buttonClassName}>
          {busy ? "Redirecting…" : "Continue with Google (via Supabase)"}
        </button>
      ) : null}
    </div>
  );
}

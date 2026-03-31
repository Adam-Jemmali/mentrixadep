"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPostOAuthRedirectPath } from "@/app/actions/auth";

const buttonClassName =
  "w-full h-10 border border-[#E2E8F0] bg-white rounded-lg text-[14px] font-medium text-slate-900 text-center hover:border-mentrixa-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none";

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const src = "https://accounts.google.com/gsi/client";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google script failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google script failed"));
    document.head.appendChild(script);
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
export function GoogleSignInButton({ variant = "signin" }: { variant?: Variant }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gsiError, setGsiError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  async function signInWithSupabaseOAuth() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    let el: HTMLDivElement | null = null;

    async function onCredential(response: { credential?: string }) {
      const token = response.credential;
      if (!token) {
        setError("Google did not return a sign-in token. Try again.");
        return;
      }
      setBusy(true);
      setError(null);
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token,
      });
      if (signError) {
        setError(signError.message);
        setBusy(false);
        return;
      }
      await supabase.auth.getSession();
      const next = await getPostOAuthRedirectPath();
      if ("error" in next) {
        setError(next.error);
        await supabase.auth.signOut();
        setBusy(false);
        return;
      }
      router.push(next.path);
      router.refresh();
    }

    const timer = window.setTimeout(() => {
      el = containerRef.current;
      if (!el || cancelled) return;

      void (async () => {
        try {
          await loadGsiScript();
          if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
            return;
          }
          const host = containerRef.current;
          host.innerHTML = "";
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (r) => {
              void onCredential(r);
            },
          });
          window.google.accounts.id.renderButton(host, {
            theme: "outline",
            size: "large",
            width: 384,
            text: variant === "signup" ? "signup_with" : "continue_with",
            locale: "en",
          });
        } catch {
          if (!cancelled) {
            setGsiError("Google Sign-In could not load. Check your connection or try again.");
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (el) el.innerHTML = "";
      else if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router.push stable; avoid re-running GSI init
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

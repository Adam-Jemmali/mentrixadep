"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/integrations/supabase/client";
import { setOAuthCookiesClient } from "@/shared/integrations/oauth-auth";
import { loadGoogleGsiScript } from "@/shared/integrations/google-gsi-loader";
import { toUserFacingAuthError } from "@/shared/core/user-facing-error";

const buttonClassName =
  "w-full h-10 border border-[#E2E8F0] bg-white rounded-lg text-[14px] font-medium text-slate-900 text-center hover:border-mentrixa-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none";

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

type Variant = "signin" | "signup";

/**
 * Preferred: Google Identity Services (`renderButton` on your page) + `signInWithIdToken`.
 * Does **not** use `signInWithOAuth`, so users are not sent through `*.supabase.co` for Google.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Web client ID — same as Supabase → Auth → Google).
 *
 * Fallback: Supabase OAuth redirect if the GSI script is blocked or fails to load.
 */
export function GoogleSignInButton({
  variant = "signin",
  oauthRole,
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
  /** GSI script blocked or failed — use Supabase OAuth redirect instead of an empty button slot. */
  const [useOAuthRedirect, setUseOAuthRedirect] = useState(false);
  const [gsiLoading, setGsiLoading] = useState(true);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

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
    if (!clientId || useOAuthRedirect) {
      setGsiLoading(false);
      return;
    }

    const cancelledRef = { cancelled: false };
    let el: HTMLDivElement | null = null;

    const timer = window.setTimeout(() => {
      el = containerRef.current;
      if (!el || cancelledRef.cancelled) return;

      void (async () => {
        setGsiLoading(true);
        try {
          await loadGoogleGsiScript(cancelledRef);
          if (cancelledRef.cancelled || !containerRef.current || !window.google?.accounts?.id) {
            return;
          }
          const host = containerRef.current;
          host.innerHTML = "";
          const g = window as typeof window & { __mxGsiInitialized?: boolean };
          if (!g.__mxGsiInitialized) {
            window.google.accounts.id.initialize({
              client_id: clientId,
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
            console.warn("[GoogleSignInButton] GSI unavailable, using OAuth redirect:", err);
            setUseOAuthRedirect(true);
          }
        } finally {
          if (!cancelledRef.cancelled) setGsiLoading(false);
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
  }, [clientId, variant, useOAuthRedirect]);

  const showOAuthRedirectButton = !clientId || useOAuthRedirect;

  if (showOAuthRedirectButton) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={signInWithSupabaseOAuth} disabled={busy} className={buttonClassName}>
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
        {!clientId ? (
          <p className="text-xs text-slate-600 leading-relaxed">
            To show Google&apos;s button on this page (without the Supabase redirect screen), add{" "}
            <code className="text-[11px] bg-slate-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>{" "}
            and add your site URL under Authorized JavaScript origins in Google Cloud Console.
          </p>
        ) : useOAuthRedirect ? (
          <p className="text-xs text-slate-600 leading-relaxed">
            Google&apos;s sign-in widget could not load (often an ad blocker or network filter). Use the
            button above — sign-in still works via a secure redirect.
          </p>
        ) : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      {gsiLoading ? (
        <div
          className="h-11 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-100"
          aria-hidden
        />
      ) : null}
      <div
        className={`w-full min-h-[44px] flex justify-center [&>div]:!w-full ${busy || gsiLoading ? "opacity-60 pointer-events-none" : ""} ${gsiLoading ? "sr-only absolute h-0 overflow-hidden" : ""}`}
        ref={containerRef}
      />
      {busy ? <p className="text-center text-xs text-slate-500">Signing you in…</p> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

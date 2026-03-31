"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const buttonClassName =
  "w-full h-10 border border-[#E2E8F0] bg-white rounded-lg text-[14px] font-medium text-slate-900 text-center hover:border-mentrixa-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none";

/**
 * Google via Supabase OAuth redirect → `/auth/callback`.
 * A visible button always (no embedded Google iframe that can load blank).
 */
export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
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

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleClick} disabled={busy} className={buttonClassName}>
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

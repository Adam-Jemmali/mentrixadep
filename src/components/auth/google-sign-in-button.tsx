"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { createClient } from "@/lib/supabase/client";
import { getPostOAuthRedirectPath } from "@/app/actions/auth";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type Flow = "signin" | "signup";

export function GoogleSignInButton({ flow = "signin" }: { flow?: Flow }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!clientId?.trim()) {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
        Add{" "}
        <code className="text-[11px] bg-amber-100/80 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>{" "}
        to your env (the same Web client ID as in Supabase → Authentication → Providers → Google).
      </p>
    );
  }

  async function onSuccess(credentialResponse: CredentialResponse) {
    const token = credentialResponse.credential;
    if (!token) {
      setError("Google did not return a credential. Try again.");
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

  return (
    <div className="w-full space-y-2">
      <div
        className={`w-full flex justify-center min-h-[40px] items-center ${busy ? "opacity-70 pointer-events-none" : ""}`}
      >
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => {
            setError("Google sign-in was cancelled or failed.");
            setBusy(false);
          }}
          useOneTap={false}
          theme="outline"
          size="large"
          width={400}
          text={flow === "signup" ? "signup_with" : "continue_with"}
          shape="rectangular"
        />
      </div>
      {busy ? (
        <p className="text-center text-xs text-slate-500">Signing you in…</p>
      ) : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

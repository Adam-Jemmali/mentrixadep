"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { MentrixaLogoLoader } from "@/components/mentrixa-logo";
import { GoogleSignInButton } from "@/features/auth/ui/google-sign-in-button";
import { toUserFacingAuthError } from "@/shared/core/user-facing-error";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordReset = searchParams.get("reset") === "1";
  const authError = searchParams.get("error");
  const emailPrefill = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const desiredRole = searchParams.get("role") === "tutor" ? "tutor" : "student";

  useEffect(() => {
    if (authError === "waitlist_rejected") {
      setError(
        "Your access request was not approved. You cannot sign in with this email. Please contact support@mentrixa.one if this seems incorrect."
      );
      return;
    }
    if (authError === "approval_required") {
      setError(
        "Your onboarding approval is still required for this account. Use the approved onboarding email link, then continue with Google or set your password."
      );
    }
  }, [authError]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashErrCode = hash.get("error_code");
    const hashErr = hash.get("error");
    const searchErrCode = searchParams.get("error_code");
    const searchErr = searchParams.get("error");

    const expired =
      hashErrCode === "otp_expired" ||
      searchErrCode === "otp_expired" ||
      (hashErr === "access_denied" && hashErrCode === "otp_expired") ||
      (searchErr === "access_denied" && searchErrCode === "otp_expired");

    if (expired) {
      setError("Your confirmation link expired. Sign up again with the same email to continue.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      if (!email || !password) {
        setError("Please enter email and password.");
        return;
      }

      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, roleHint: desiredRole }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
        redirectToSignup?: boolean;
        signupRole?: "student" | "tutor";
      };
      if (body.redirectToSignup) {
        const signupRole = body.signupRole === "tutor" ? "tutor" : desiredRole;
        router.push(`/auth/signup?role=${signupRole}`);
        return;
      }
      if (!res.ok || !body.ok || !body.redirectTo) {
        setError(toUserFacingAuthError(body.error ?? "Sign in failed. Please try again."));
        return;
      }
      if (body.redirectTo.startsWith("/auth/session-sync")) {
        window.location.assign(body.redirectTo);
        return;
      }
      router.push(body.redirectTo);
      router.refresh();
    } catch (err) {
      setError(toUserFacingAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-md"
          aria-busy
          aria-live="polite"
        >
          <MentrixaLogoLoader size="xl" label="Signing you in" />
        </div>
      ) : null}
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-white mb-1">
        Sign in
      </h1>
      <p className="text-sm text-slate-300 mb-5">
        New to Mentrixa?{" "}
        <Link href={`/auth/signup?role=${desiredRole}`} className="text-indigo-300 hover:text-indigo-200 hover:underline">
          Sign up
        </Link>
      </p>

      <GoogleSignInButton variant="signin" oauthRole={desiredRole} />

      {passwordReset && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 text-center">
          ✓ Password updated successfully. Please sign in with your new password.
        </div>
      )}

      <div className="flex items-center gap-3 my-5">
        <span className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <span className="flex-1 h-px bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-1.5">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@university or your personal email"
            defaultValue={emailPrefill}
            className="input-premium border-slate-200 transition-all duration-200"
          />
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-1.5">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="input-premium border-slate-200 pr-12 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <Link
            href="/auth/forgot-password"
            className="block mt-1.5 text-xs text-slate-400 hover:text-slate-200 text-right"
          >
            Forgot password
          </Link>
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-5" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserFacingAuthError } from "@/lib/user-facing-error";

export function ActivateAuthClient({
  email,
  role,
  googleSignInPreferred = false,
}: {
  email: string;
  role: "student" | "tutor";
  /**
   * True when this email already used Google OAuth — hide password fields until the user
   * explicitly chooses “Continue with email”.
   */
  googleSignInPreferred?: boolean;
}) {
  const [showEmailPasswordForm, setShowEmailPasswordForm] = useState(!googleSignInPreferred);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.currentTarget);
      const password = String(formData.get("password") ?? "");
      const confirmPassword = String(formData.get("confirmPassword") ?? "");

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          role,
          ageConfirmed: true,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        sessionEstablished?: boolean;
      };

      if (!res.ok || !body.ok) {
        setError(toUserFacingAuthError(body.error ?? "Could not create account."));
        return;
      }

      if (body.sessionEstablished) {
        window.location.assign("/auth/session-sync");
        return;
      }

      setSuccess("Account created. Check your email to confirm, then sign in.");
    } catch (err) {
      setError(toUserFacingAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Activate your Mentrixa access</h1>
      <p className="mt-2 text-sm text-slate-600">
        {googleSignInPreferred && !showEmailPasswordForm ? (
          <>
            Your onboarding approval is confirmed for{" "}
            <span className="font-medium text-slate-800">{email}</span>. If you signed up with Google,
            use the button below. You can also create a password instead.
          </>
        ) : (
          <>
            Your onboarding approval is confirmed for{" "}
            <span className="font-medium text-slate-800">{email}</span>. Continue with Google or create
            a password below.
          </>
        )}
      </p>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            role === "tutor" ? "bg-violet-50" : "bg-emerald-50",
          )}
        >
          <Image
            src={role === "tutor" ? "/icons/guide.svg" : "/icons/mentrixer.svg"}
            alt=""
            width={24}
            height={24}
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Approved role</p>
          <p className="text-sm font-semibold text-slate-900">
            {role === "tutor" ? "Guide (Tutor)" : "Mentrixer (Student)"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <GoogleSignInButton variant="signup" oauthRole={role} />
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or continue with email</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {showEmailPasswordForm ? (
        <form onSubmit={handleCreatePassword} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Create password</Label>
            <Input id="password" name="password" type="password" minLength={8} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              required
              className="mt-1"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="email-preview">Email</Label>
            <Input id="email-preview" value={email} disabled className="mt-1" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => setShowEmailPasswordForm(true)}>
            Continue with email
          </Button>
        </div>
      )}

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href={`/auth/signin?signin=1&email=${encodeURIComponent(email)}`}
          className="font-semibold text-mentrixa-600 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

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
}: {
  email: string;
  role: "student" | "tutor";
}) {
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
        Your onboarding approval is confirmed. Continue with Google or create a password for {email}.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          role === "tutor" ? "bg-violet-50" : "bg-emerald-50"
        )}>
          <Image 
            src={role === "tutor" ? "/icons/guide.svg" : "/icons/mentrixer.svg"} 
            alt="" 
            width={24} 
            height={24} 
          />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Approved role</p>
          <p className="text-sm font-semibold text-slate-900">{role === "tutor" ? "Guide (Tutor)" : "Mentrixer (Student)"}</p>
        </div>
      </div>

      <div className="mt-5">
        <GoogleSignInButton variant="signup" oauthRole={role} />
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

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
          <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required className="mt-1" />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account? <Link href={`/auth/signin?email=${encodeURIComponent(email)}`} className="text-mentrixa-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

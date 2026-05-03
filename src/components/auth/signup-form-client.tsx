"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { toUserFacingAuthError } from "@/lib/user-facing-error";
import { cn } from "@/lib/utils";

type Role = "student" | "tutor";

export function SignupFormClient() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const password = String(formData.get("password") ?? "");
      const confirmPassword = String(formData.get("confirmPassword") ?? "");
      const ageConfirmed = formData.get("ageConfirmed") === "on";

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
          ageConfirmed,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(toUserFacingAuthError(body.error ?? "Signup failed."));
        setLoading(false);
        return;
      }

      if (body.sessionEstablished) {
        router.replace("/auth/session-sync");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(toUserFacingAuthError(err));
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Please check your email</h1>
        <p className="text-sm text-slate-600 mb-4">
          We&apos;ve sent a confirmation link to <span className="font-semibold text-slate-900">{email}</span>.
        </p>
        {role === "tutor" && (
          <p className="text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
            Admin may still need to approve your account before you can sign in.
          </p>
        )}
        <Link
          href="/auth/signin"
          className="text-sm font-semibold text-mentrixa-600 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Create your account</h1>
      <p className="text-sm text-slate-500 mb-6">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-mentrixa-600 hover:underline">
          Sign in
        </Link>
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setRole("student")}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
            role === "student"
              ? "border-mentrixa-500 bg-mentrixa-50/50 ring-1 ring-mentrixa-500"
              : "border-slate-200 bg-white hover:border-slate-300"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            role === "student" ? "bg-mentrixa-100" : "bg-slate-50"
          )}>
            <Image src="/icons/mentrixer.svg" alt="" width={24} height={24} />
          </div>
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            role === "student" ? "text-mentrixa-700" : "text-slate-500"
          )}>
            I want to learn
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRole("tutor")}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
            role === "tutor"
              ? "border-violet-500 bg-violet-50/50 ring-1 ring-violet-500"
              : "border-slate-200 bg-white hover:border-slate-300"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            role === "tutor" ? "bg-violet-100" : "bg-slate-50"
          )}>
            <Image src="/icons/guide.svg" alt="" width={24} height={24} />
          </div>
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            role === "tutor" ? "text-violet-700" : "text-slate-500"
          )}>
            I want to teach
          </span>
        </button>
      </div>

      <GoogleSignInButton variant="signup" oauthRole={role} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#FAFAFA] px-2 text-slate-400">or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-premium"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="input-premium"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="input-premium"
          />
        </div>

        <div className="flex items-start gap-2 py-1">
          <input
            id="ageConfirmed"
            name="ageConfirmed"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-slate-300 text-mentrixa-600 focus:ring-mentrixa-500"
          />
          <Label htmlFor="ageConfirmed" className="text-xs text-slate-500 leading-normal font-normal">
            I confirm that I am 13 years old or older and agree to the Terms of Service.
          </Label>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserFacingAuthError } from "@/lib/user-facing-error";
import { cn } from "@/lib/utils";

type Role = "student" | "tutor";

const GoogleSignInButton = dynamic(
  () => import("@/components/auth/google-sign-in-button").then((m) => m.GoogleSignInButton),
  {
    loading: () => <div className="h-11 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100" />,
  },
);

export function SignupFormClient({
  initialRole = "student",
  waitlistEnabled = false,
}: {
  initialRole?: Role;
  waitlistEnabled?: boolean;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const [accessRequestedMessage, setAccessRequestedMessage] = useState<string | null>(null);
  const roleLabel = role === "tutor" ? "Guide" : "Mentrixer";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentRole = params.get("role");
    const nextRole = role === "tutor" ? "tutor" : "student";
    if (currentRole === nextRole) return;
    params.set("role", nextRole);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [role]);

  async function checkAccessAndMaybeRequest(emailValue: string): Promise<"approved" | "blocked" | "requested"> {
    const statusRes = await fetch(`/api/waitlist/status?email=${encodeURIComponent(emailValue)}`);
    const statusJson = (await statusRes.json().catch(() => ({}))) as {
      approved?: boolean;
      status?: "approved" | "pending" | "rejected" | "none" | "missing" | "error";
    };
    const status = statusJson.status;
    if (status === "approved" || statusJson.approved) {
      return "approved";
    }
    if (status === "pending") {
      setError(
        `Your ${role === "tutor" ? "Guide" : "Mentrixer"} access request is still pending admin review.`,
      );
      return "blocked";
    }
    if (status === "rejected") {
      setError(
        `Your ${role === "tutor" ? "Guide" : "Mentrixer"} access request was not approved. Contact support@mentrixa.one if this seems incorrect.`,
      );
      return "blocked";
    }

    const joinRes = await fetch("/api/waitlist/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailValue, role }),
    });
    const joinJson = (await joinRes.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      status?: "pending" | "approved" | "rejected";
      approved?: boolean;
    };
    if (!joinRes.ok) {
      setError(joinJson.error ?? "Could not start access request.");
      return "blocked";
    }
    if (joinJson.approved || joinJson.status === "approved") {
      return "approved";
    }
    setAccessRequested(true);
    setAccessRequestedMessage(
      joinJson.message ??
        `You're in onboarding as a ${role === "tutor" ? "Guide" : "Mentrixer"}. Check your email for next steps.`,
    );
    return "requested";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const ageConfirmed = formData.get("ageConfirmed") === "on";
      const normalizedEmail = email.trim().toLowerCase();
      if (waitlistEnabled) {
        const access = await checkAccessAndMaybeRequest(normalizedEmail);
        if (access !== "approved") {
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          role,
          ageConfirmed,
          requestActivation: true,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(toUserFacingAuthError(body.error ?? "Signup failed."));
        setLoading(false);
        return;
      }

      if (body.sessionEstablished) {
        window.location.assign("/auth/session-sync");
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email to continue</h1>
        <p className="text-sm text-slate-600 mb-4">
          We&apos;ve sent an activation link for your <span className="font-semibold text-slate-900">{roleLabel}</span> setup to{" "}
          <span className="font-semibold text-slate-900">{email}</span>.
        </p>
        <div className="text-left text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
          <p className="font-semibold text-slate-700">What to do next:</p>
          <p>1) Open the email and click the activation link.</p>
          <p>2) Create your password on the activation page.</p>
          <p>3) Sign in and continue as a {roleLabel}.</p>
          {role === "tutor" ? (
            <p className="text-slate-500">Note: Admin approval rules still apply for Guide onboarding.</p>
          ) : null}
        </div>
        <Link
          href="/auth/signin"
          className="text-sm font-semibold text-mentrixa-600 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (accessRequested) {
    return (
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access request submitted</h1>
        <p className="text-sm text-slate-600 mb-4">
          {accessRequestedMessage ??
            `We've received your ${role === "tutor" ? "Guide" : "Mentrixer"} onboarding request.`}
        </p>
        <div className="text-left text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
          <p>We emailed next steps to <span className="font-semibold text-slate-900">{email}</span>.</p>
          <p>Once approved, use the next activation email to create your password and sign in as {roleLabel}.</p>
        </div>
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
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        You are signing up as <span className="font-semibold text-slate-800">{roleLabel}</span>
      </div>

      <GoogleSignInButton variant="signup" oauthRole={role} />
      <p className="mt-2 text-xs text-slate-500">
        Google button: continues immediately with your selected role.
      </p>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#FAFAFA] px-2 text-slate-400">or continue with email link</span>
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
          {loading ? "Sending link..." : "Continue with email"}
        </Button>
        <p className="text-xs text-slate-500">
          Email button: sends activation link, then you set password and sign in as {roleLabel}.
        </p>
      </form>
    </div>
  );
}

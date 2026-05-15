"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserFacingAuthError } from "@/lib/user-facing-error";
import { cn } from "@/lib/utils";

type Role = "student" | "tutor";

const WAITLIST_SNAPSHOT_KEY = "mentrixa_signup_waitlist_v1";
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type WaitlistSnapshot = {
  email: string;
  role: Role;
  accessRequestMode: "new" | "pending_review";
  accessRequestedMessage: string | null;
  ts: number;
};

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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  /** `new` = just submitted waitlist; `pending_review` = already waiting on admin */
  const [accessRequestMode, setAccessRequestMode] = useState<"new" | "pending_review" | null>(null);
  const [accessRequestedMessage, setAccessRequestedMessage] = useState<string | null>(null);
  const [googleFlowBusy, setGoogleFlowBusy] = useState(false);
  const outcomeTopRef = useRef<HTMLDivElement>(null);
  const restoredSnapshotRef = useRef(false);
  const roleLabel = role === "tutor" ? "Guide" : "Mentrixer";

  useEffect(() => {
    if (!waitlistEnabled || restoredSnapshotRef.current) return;
    try {
      const raw = sessionStorage.getItem(WAITLIST_SNAPSHOT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<WaitlistSnapshot>;
      if (!data.email || typeof data.ts !== "number" || Date.now() - data.ts > SNAPSHOT_MAX_AGE_MS) {
        sessionStorage.removeItem(WAITLIST_SNAPSHOT_KEY);
        return;
      }
      restoredSnapshotRef.current = true;
      setEmail(data.email);
      setRole(data.role === "tutor" ? "tutor" : "student");
      setAccessRequestMode(data.accessRequestMode === "pending_review" ? "pending_review" : "new");
      setAccessRequestedMessage(
        typeof data.accessRequestedMessage === "string" ? data.accessRequestedMessage : null,
      );
      setAccessRequested(true);
    } catch {
      try {
        sessionStorage.removeItem(WAITLIST_SNAPSHOT_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [waitlistEnabled]);

  useEffect(() => {
    if (!waitlistEnabled || !accessRequested || !email) return;
    try {
      const payload: WaitlistSnapshot = {
        email,
        role,
        accessRequestMode: accessRequestMode === "pending_review" ? "pending_review" : "new",
        accessRequestedMessage,
        ts: Date.now(),
      };
      sessionStorage.setItem(WAITLIST_SNAPSHOT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota / private mode */
    }
  }, [waitlistEnabled, accessRequested, email, role, accessRequestMode, accessRequestedMessage]);

  useEffect(() => {
    if (!success) return;
    try {
      sessionStorage.removeItem(WAITLIST_SNAPSHOT_KEY);
    } catch {
      /* ignore */
    }
  }, [success]);

  useEffect(() => {
    if (!success && !accessRequested) return;
    const id = requestAnimationFrame(() => {
      outcomeTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [success, accessRequested]);

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
      setError(null);
      setAccessRequestMode("pending_review");
      setAccessRequested(true);
      setAccessRequestedMessage(
        `Your ${role === "tutor" ? "Guide" : "Mentrixer"} access request is waiting for admin approval. Watch your inbox — we email you when you can finish setup (Google or password).`,
      );
      return "requested";
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
      if (joinJson.status === "pending") {
        setError(null);
        setAccessRequestMode("pending_review");
        setAccessRequested(true);
        setAccessRequestedMessage(
          joinJson.error ??
            `Your ${role === "tutor" ? "Guide" : "Mentrixer"} request is already pending admin review. Watch your email for updates.`,
        );
        return "requested";
      }
      setError(joinJson.error ?? "Could not start access request.");
      return "blocked";
    }
    if (joinJson.approved || joinJson.status === "approved") {
      return "approved";
    }
    setAccessRequestMode("new");
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
      const normalizedEmail = email.trim().toLowerCase();
      if (!ageConfirmed) {
        setError("Please confirm you are 13 years old or older and agree to the Terms of Service.");
        return;
      }
      if (waitlistEnabled) {
        const access = await checkAccessAndMaybeRequest(normalizedEmail);
        if (access !== "approved") {
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
        return;
      }

      if (body.sessionEstablished) {
        window.location.assign("/auth/session-sync");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(toUserFacingAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSignupComplete = useCallback(
    async (googleEmail: string): Promise<"success" | "abort"> => {
      setGoogleFlowBusy(true);
      try {
        setError(null);
        if (!ageConfirmed) {
          setError("Please confirm you are 13 years old or older and agree to the Terms of Service.");
          return "abort";
        }
        const normalizedEmail = googleEmail.trim().toLowerCase();
        setEmail(normalizedEmail);

        if (waitlistEnabled) {
          const access = await checkAccessAndMaybeRequest(normalizedEmail);
          if (access !== "approved") {
            return "abort";
          }
        }

        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              email: normalizedEmail,
              role,
              ageConfirmed: true,
              requestActivation: true,
            }),
          });
          const body = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            sessionEstablished?: boolean;
          };
          if (!res.ok || !body.ok) {
            setError(toUserFacingAuthError(body.error ?? "Could not send activation link."));
            return "abort";
          }
          if (body.sessionEstablished) {
            window.location.assign("/auth/session-sync");
            return "success";
          }
          setSuccess(true);
          const supabase = createClient();
          await new Promise<void>((r) => setTimeout(r, 0));
          await supabase.auth.signOut();
          return "success";
        } catch (err) {
          setError(toUserFacingAuthError(err));
          return "abort";
        }
      } finally {
        setGoogleFlowBusy(false);
      }
    },
    [ageConfirmed, waitlistEnabled, role],
  );

  if (success) {
    return (
      <div
        ref={outcomeTopRef}
        className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-6"
      >
        <p className="mb-3 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
          Step complete — check your email
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email to continue</h1>
        <p className="text-sm text-slate-600 mb-4">
          We&apos;ve sent an activation link for your <span className="font-semibold text-slate-900">{roleLabel}</span> setup to{" "}
          <span className="font-semibold text-slate-900">{email}</span>.
        </p>
        <div className="text-left text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
          <p className="font-semibold text-slate-700">What to do next:</p>
          <p>1) Open the email and click the activation link.</p>
          <p>2) On the activation page, create a password or continue with Google (no password needed for Google).</p>
          <p>3) Finish sign-in and continue as a {roleLabel}.</p>
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
    const awaitingAdmin = accessRequestMode === "pending_review";
    return (
      <div
        ref={outcomeTopRef}
        className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-6"
      >
        <p className="mb-3 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
          {awaitingAdmin
            ? "Step complete — wait for admin approval"
            : "Step complete — check your email for confirmation"}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {awaitingAdmin ? "Waiting for admin approval" : "Access request submitted"}
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          {accessRequestedMessage ??
            `We've received your ${role === "tutor" ? "Guide" : "Mentrixer"} onboarding request.`}
        </p>
        <div className="text-left text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
          <p>
            {awaitingAdmin ? (
              <>
                We&apos;ll use <span className="font-semibold text-slate-900">{email}</span> for status updates. If you
                just joined, you should also get a confirmation email (check spam).
              </>
            ) : (
              <>
                We emailed next steps to <span className="font-semibold text-slate-900">{email}</span>.
              </>
            )}
          </p>
          <p>Once approved, use the activation email to finish setup (Google or password) and sign in as {roleLabel}.</p>
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

      <ol className="mb-5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] font-medium text-slate-500">
        <li className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">1 · Role</li>
        <li aria-hidden="true" className="text-slate-300">
          →
        </li>
        <li className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">2 · Terms</li>
        <li aria-hidden="true" className="text-slate-300">
          →
        </li>
        <li className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">3 · Google or email</li>
      </ol>

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

      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100 mb-3">
          {error}
        </div>
      ) : null}

      <div className="flex items-start gap-2 py-1 mb-3">
        <input
          id="ageConfirmed"
          name="ageConfirmed"
          type="checkbox"
          checked={ageConfirmed}
          onChange={(e) => setAgeConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-mentrixa-600 focus:ring-mentrixa-500"
        />
        <Label htmlFor="ageConfirmed" className="text-xs text-slate-500 leading-normal font-normal">
          I confirm that I am 13 years old or older and agree to the Terms of Service.
        </Label>
      </div>

      {googleFlowBusy ? (
        <div
          className="mb-3 rounded-lg border border-mentrixa-200 bg-mentrixa-50/80 px-3 py-2.5 text-xs text-mentrixa-900"
          role="status"
          aria-live="polite"
        >
          <span className="font-semibold">Working on your signup…</span>{" "}
          {waitlistEnabled
            ? "Checking waitlist status or sending your activation email — stay on this page."
            : "Sending your activation email — stay on this page."}
        </div>
      ) : null}

      <GoogleSignInButton
        variant="signup"
        oauthRole={role}
        onSignupGoogleComplete={handleGoogleSignupComplete}
      />
      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
        {waitlistEnabled ? (
          <>
            After you choose Google, <span className="font-medium text-slate-700">stay on this page</span>. We show
            waitlist status (for example waiting for admin approval) or &quot;check your email&quot; here — you do not
            need to use the email field below unless you prefer email signup.
          </>
        ) : (
          <>
            After you choose Google, <span className="font-medium text-slate-700">stay on this page</span>. We show
            &quot;check your email&quot; and next steps here — same flow as the button below.
          </>
        )}
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

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Sending link..." : "Continue with email"}
        </Button>
        <p className="text-xs text-slate-500 leading-relaxed">
          Sends the activation link to the address above. After you click the link in your inbox, finish setup with a
          password or Google as {roleLabel}. You can use Google above instead — no need for both.
        </p>
      </form>
    </div>
  );
}

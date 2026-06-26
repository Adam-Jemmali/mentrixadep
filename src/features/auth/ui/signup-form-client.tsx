"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/shared/integrations/supabase/client";
import { submitOnboardingRequest } from "@/features/registration/onboarding-request-client";
import { readEmailFromGoogleIdToken } from "@/shared/integrations/google-id-token";
import { GoogleSignInButton } from "@/features/auth/ui/google-sign-in-button";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toUserFacingAuthError } from "@/shared/core/user-facing-error";
import { cn } from "@/shared/core/utils";
import { AccessRequestSubmitted } from "@/features/auth/ui/access-request-submitted";

type Role = "student" | "tutor";

const ONBOARDING_SNAPSHOT_KEY = "mentrixa_signup_onboarding_v1";
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type OnboardingSnapshot = {
  email: string;
  role: Role;
  accessRequestMode: "new" | "pending_review";
  accessRequestedMessage: string | null;
  ts: number;
};

function applyOnboardingOutcome(
  result: Awaited<ReturnType<typeof submitOnboardingRequest>>,
  _role: Role,
  setters: {
    setError: (v: string | null) => void;
    setAccessRequestMode: (v: "new" | "pending_review" | null) => void;
    setAccessRequested: (v: boolean) => void;
    setAccessRequestedMessage: (v: string | null) => void;
  },
): "approved" | "blocked" | "requested" {
  const { setError, setAccessRequestMode, setAccessRequested, setAccessRequestedMessage } = setters;

  if (result.outcome === "approved") {
    return "approved";
  }
  if (result.outcome === "rejected" || result.outcome === "error") {
    setError(result.error ?? "Could not start access request.");
    return "blocked";
  }
  if (result.outcome === "pending_review") {
    setError(null);
    setAccessRequestMode("pending_review");
    setAccessRequested(true);
    setAccessRequestedMessage(result.message ?? null);
    return "requested";
  }
  setError(null);
  setAccessRequestMode("new");
  setAccessRequested(true);
  setAccessRequestedMessage(result.message ?? null);
  return "requested";
}

function persistOnboardingSnapshot(snapshot: OnboardingSnapshot): void {
  try {
    sessionStorage.setItem(ONBOARDING_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export function SignupFormClient({
  initialRole = "student",
  initialAccessSubmitted,
  initialError = null,
}: {
  initialRole?: Role;
  initialAccessSubmitted?: { email: string; role: Role; confirmationEmailSent?: boolean };
  initialError?: string | null;
  /** @deprecated Onboarding join always runs; prop kept for call-site compatibility. */
  waitlistEnabled?: boolean;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const [accessRequestMode, setAccessRequestMode] = useState<"new" | "pending_review" | null>(null);
  const [accessRequestedMessage, setAccessRequestedMessage] = useState<string | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(true);
  const [onboardingConfirming, setOnboardingConfirming] = useState(
    () => !!initialAccessSubmitted,
  );
  const [googleFlowBusy, setGoogleFlowBusy] = useState(false);
  const outcomeTopRef = useRef<HTMLDivElement>(null);
  const restoredSnapshotRef = useRef(false);
  const roleLabel = role === "tutor" ? "Guide" : "Mentrixer";

  const onboardingSetters = {
    setError,
    setAccessRequestMode,
    setAccessRequested,
    setAccessRequestedMessage,
  };

  useEffect(() => {
    if (restoredSnapshotRef.current) return;
    try {
      const raw = sessionStorage.getItem(ONBOARDING_SNAPSHOT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<OnboardingSnapshot>;
      if (!data.email || typeof data.ts !== "number" || Date.now() - data.ts > SNAPSHOT_MAX_AGE_MS) {
        sessionStorage.removeItem(ONBOARDING_SNAPSHOT_KEY);
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
        sessionStorage.removeItem(ONBOARDING_SNAPSHOT_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!initialAccessSubmitted) return;
    const { email: initEmail, role: initRole } = initialAccessSubmitted;
    restoredSnapshotRef.current = true;
    setEmail(initEmail);
    setRole(initRole);
    setOnboardingConfirming(true);
    setAccessRequested(false);

    let cancelled = false;
    void (async () => {
      const result = await submitOnboardingRequest(initEmail, initRole);
      if (cancelled) return;
      setOnboardingConfirming(false);
      if (result.outcome === "rejected" || result.outcome === "error") {
        setError(result.error ?? "Could not start access request.");
        return;
      }
      setConfirmationEmailSent(result.confirmationEmailSent === true);
      applyOnboardingOutcome(result, initRole, onboardingSetters);
      persistOnboardingSnapshot({
        email: initEmail,
        role: initRole,
        accessRequestMode: result.outcome === "pending_review" ? "pending_review" : "new",
        accessRequestedMessage: result.message ?? null,
        ts: Date.now(),
      });
    })();

    const params = new URLSearchParams(window.location.search);
    params.delete("access");
    params.delete("email");
    params.set("role", initRole);
    const qs = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );

    return () => {
      cancelled = true;
    };
  }, [initialAccessSubmitted]);

  useEffect(() => {
    if (!accessRequested || !email) return;
    try {
      const payload: OnboardingSnapshot = {
        email,
        role,
        accessRequestMode: accessRequestMode === "pending_review" ? "pending_review" : "new",
        accessRequestedMessage,
        ts: Date.now(),
      };
      sessionStorage.setItem(ONBOARDING_SNAPSHOT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota / private mode */
    }
  }, [accessRequested, email, role, accessRequestMode, accessRequestedMessage]);

  useEffect(() => {
    if (!success) return;
    try {
      sessionStorage.removeItem(ONBOARDING_SNAPSHOT_KEY);
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

  async function runOnboardingRequest(
    emailValue: string,
    syncUi = false,
  ): Promise<{
    access: "approved" | "blocked" | "requested";
    result: Awaited<ReturnType<typeof submitOnboardingRequest>>;
  }> {
    const result = await submitOnboardingRequest(emailValue, role);
    const apply = () => {
      if (result.outcome === "requested" || result.outcome === "pending_review") {
        setConfirmationEmailSent(result.confirmationEmailSent === true);
      }
      return applyOnboardingOutcome(result, role, onboardingSetters);
    };
    if (syncUi) {
      let access: "approved" | "blocked" | "requested" = "blocked";
      flushSync(() => {
        access = apply();
      });
      return { access, result };
    }
    return { access: apply(), result };
  }

  async function signOutGoogleSession(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
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

      const { access } = await runOnboardingRequest(normalizedEmail);
      if (access !== "approved") {
        return;
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
    async (googleCredential: string): Promise<"success" | "abort"> => {
      setGoogleFlowBusy(true);
      try {
        setError(null);
        if (!ageConfirmed) {
          setError("Please confirm you are 13 years old or older and agree to the Terms of Service.");
          return "abort";
        }

        const normalizedEmail = readEmailFromGoogleIdToken(googleCredential);
        if (!normalizedEmail) {
          setError("Google did not return an email address. Try again or use email signup.");
          return "abort";
        }
        setEmail(normalizedEmail);

        // 1) registration_requests row + "Onboarding request received" email (same as Continue with email).
        const { access, result } = await runOnboardingRequest(normalizedEmail, true);
        if (access === "blocked") {
          return "abort";
        }

        const supabase = createClient();
        const { error: signError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: googleCredential,
        });
        if (signError) {
          setError(toUserFacingAuthError(signError));
          if (access === "requested") {
            persistOnboardingSnapshot({
              email: normalizedEmail,
              role,
              accessRequestMode: result.outcome === "pending_review" ? "pending_review" : "new",
              accessRequestedMessage:
                typeof result.message === "string" ? result.message : null,
              ts: Date.now(),
            });
          }
          return "abort";
        }

        if (access !== "approved") {
          persistOnboardingSnapshot({
            email: normalizedEmail,
            role,
            accessRequestMode: result.outcome === "pending_review" ? "pending_review" : "new",
            accessRequestedMessage:
              typeof result.message === "string" ? result.message : null,
            ts: Date.now(),
          });
          await signOutGoogleSession();
          return "abort";
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
            await signOutGoogleSession();
            return "abort";
          }
          if (body.sessionEstablished) {
            window.location.assign("/auth/session-sync");
            return "success";
          }
          flushSync(() => {
            setSuccess(true);
          });
          await signOutGoogleSession();
          return "success";
        } catch (err) {
          setError(toUserFacingAuthError(err));
          await signOutGoogleSession();
          return "abort";
        }
      } finally {
        setGoogleFlowBusy(false);
      }
    },
    [ageConfirmed, role],
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
          href="/auth/signin?signin=1"
          className="text-sm font-semibold text-mentrixa-600 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (onboardingConfirming) {
    return (
      <div className="text-center py-10 animate-in fade-in duration-300">
        <p className="text-sm font-medium text-slate-700">Submitting your onboarding request…</p>
        <p className="mt-2 text-xs text-slate-500">Sending confirmation to your email.</p>
      </div>
    );
  }

  if (accessRequested) {
    return (
      <div ref={outcomeTopRef}>
        <AccessRequestSubmitted
          email={email}
          roleLabel={roleLabel}
          message={accessRequestedMessage}
          awaitingAdmin={accessRequestMode === "pending_review"}
          confirmationEmailSent={confirmationEmailSent}
        />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Create your account</h1>
      <p className="text-sm text-slate-500 mb-6">
        Already have an account?{" "}
        <Link href="/auth/signin?signin=1" className="text-mentrixa-600 hover:underline">
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
          <span className="font-semibold">Working on your signup…</span> Submitting your onboarding request — stay on
          this page.
        </div>
      ) : null}

      <GoogleSignInButton
        variant="signup"
        oauthRole={role}
        onSignupGoogleComplete={handleGoogleSignupComplete}
      />
      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
        After you choose Google, <span className="font-medium text-slate-700">stay on this page</span>. We show access
        request confirmation.
      </p>

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
        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Sending link..." : "Continue with email"}
        </Button>
        <p className="text-xs text-slate-500 leading-relaxed">
          Submits your onboarding request first, then sends an activation link if you are already approved.
          
        </p>
      </form>
    </div>
  );
}

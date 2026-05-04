"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Clock, Rocket, XCircle } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

type Props = {
  role: "student" | "tutor" | "admin" | null;
  /** From `registration_requests.status` — rejected users see a dedicated screen and cannot re-join the waitlist with the same email. */
  registrationStatus: "pending" | "rejected";
};

export function PendingApprovalContent({ role, registrationStatus }: Props) {
  const isGuide = role === "tutor";
  const rejected = registrationStatus === "rejected";

  const headline = rejected
    ? "Application not approved"
    : isGuide
      ? "We’re reviewing your Guide application"
      : "Almost there";

  const subtext = rejected
    ? "Your request was reviewed and not approved. App access stays locked for this account. You cannot join the waitlist again with this email. If you believe this is a mistake, contact support@mentrixa.one."
    : isGuide
      ? "Thanks for applying to teach on Mentrixa. Our team usually reviews Guide profiles within 24 hours. While your request is pending, app access stays locked."
      : "Your account is waiting for admin approval. While your request is pending, app access stays locked.";
  const liveHint =
    "When approved, You’ll land on your Mentrixer dashboard with our guided tour!";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-soft">
      <motion.div
        className="w-full max-w-md flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {rejected ? (
          <div className="relative w-28 h-28 mb-8 flex items-center justify-center rounded-full bg-rose-50 border-2 border-rose-200">
            <XCircle className="w-14 h-14 text-rose-600" aria-hidden />
          </div>
        ) : (
          <div className="relative w-32 h-32 mb-8">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="w-full h-full text-brand-600"
              aria-hidden
            >
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
              <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
              <motion.g
                style={{ transformOrigin: "32px 32px" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <line x1="32" y1="32" x2="32" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </motion.g>
              <motion.g
                style={{ transformOrigin: "32px 32px" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
              >
                <line x1="32" y1="32" x2="32" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </motion.g>
              {[0, 90, 180, 270].map((rot, i) => (
                <line
                  key={i}
                  x1="32"
                  y1="10"
                  x2="32"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                  style={{ transform: `rotate(${rot}deg)`, transformOrigin: "32px 32px" }}
                />
              ))}
            </svg>
          </div>
        )}

        <h2 className="font-display font-bold text-2xl text-text-primary mb-2 text-center">
          {headline}
        </h2>
        <p className="text-text-muted text-sm text-center mb-6 max-w-sm leading-relaxed">
          {subtext}
        </p>
        {!rejected ? (
          <p className="text-text-muted/90 text-xs text-center mb-6 max-w-sm leading-relaxed border border-surface-border rounded-lg px-3 py-2 bg-white/40">
            {liveHint}
          </p>
        ) : null}

        {rejected ? (
          <div className="w-full mb-10 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-800 mb-2">Status</p>
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
              <span className="text-sm text-slate-800">Account created</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden />
              <span className="text-sm text-rose-900 font-medium">Review — not approved</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <Rocket className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
              <span className="text-sm text-slate-600">Access — unavailable</span>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full flex items-center mb-2">
              <div className="flex-1 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-50 border-2 border-brand-500 flex items-center justify-center text-brand-600 shrink-0">
                  <Check className="w-4 h-4" aria-hidden />
                </div>
                <span className="text-xs font-medium text-brand-600">Account created</span>
              </div>
              <div className="flex-1 h-0.5 bg-surface-border min-w-[20px]" aria-hidden />
              <div className="flex-1 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-surface-border bg-surface-muted flex items-center justify-center text-text-muted shrink-0">
                  <Clock className="w-4 h-4" aria-hidden />
                </div>
                <span className="text-xs font-medium text-text-muted">Review</span>
              </div>
              <div className="flex-1 h-0.5 bg-surface-border min-w-[20px]" aria-hidden />
              <div className="flex-1 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-surface-border bg-surface-muted flex items-center justify-center text-text-muted shrink-0">
                  <Rocket className="w-4 h-4" aria-hidden />
                </div>
                <span className="text-xs font-medium text-text-muted">Access</span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-surface-border rounded-full mb-10 overflow-hidden">
              <motion.div
                className="h-full bg-brand-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "33%" }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </>
        )}

        {rejected ? (
          <div className="mt-2 flex w-full flex-col items-center gap-3 text-center">
            <p className="text-sm font-medium text-rose-700">Sorry, you have been rejected.</p>
            <Button asChild type="button" className="btn-primary">
              <Link href="/">Back to Mentrixa</Link>
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="btn-ghost mt-auto"
            onClick={async () => {
              await signOut();
            }}
          >
            Sign out
          </Button>
        )}
      </motion.div>
    </div>
  );
}

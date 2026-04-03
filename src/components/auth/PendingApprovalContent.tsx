"use client";

import { motion } from "framer-motion";
import { signOut } from "@/app/actions/auth";
import { Check, Clock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  role: "student" | "tutor" | "admin" | null;
};

export function PendingApprovalContent({ role }: Props) {
  const isGuide = role === "tutor";
  const headline = isGuide
    ? "We’re reviewing your Guide application"
    : "Almost there";

  const subtext = isGuide
    ? "Thanks for applying to teach on Mentrixa. Our team usually reviews Guide profiles within 24 hours. Learners with a university email are often auto-approved when open enrollment is on—your Guide application gets a manual check so we keep quality high."
    : "Your Learner account is ready as soon as registration is approved. If open enrollment is enabled, you may already have access—try refreshing or signing in again in a moment.";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-soft">
      <motion.div
        className="w-full max-w-md flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
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

        <h2 className="font-display font-bold text-2xl text-text-primary mb-2 text-center">
          {headline}
        </h2>
        <p className="text-text-muted text-sm text-center mb-6 max-w-sm leading-relaxed">
          {subtext}
        </p>

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

        <Button
          type="button"
          variant="ghost"
          className="btn-ghost mt-auto"
          onClick={async () => {
            await signOut();
            window.location.href = "/";
          }}
        >
          Sign out
        </Button>
      </motion.div>
    </div>
  );
}

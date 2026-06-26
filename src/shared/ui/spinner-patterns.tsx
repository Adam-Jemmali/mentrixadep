"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { MentrixaLogoLoader } from "@/components/mentrixa-logo";
import { Spinner } from "@/shared/ui/hero-spinner";
import { cn } from "@/shared/core/utils";
import { playMentrixaLoadingOnce } from "@/shared/integrations/mentrixa-sounds";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";
import {
  mentrixaSpinnerMessage,
  type MentrixaSpinnerKind,
} from "@/shared/ui/spinner-messages-pure";

export type MentrixaSpinnerTone = "light" | "dark" | "workbench";

const TONE_CLASS: Record<MentrixaSpinnerTone, string> = {
  light: "mentrixa-spinner--light",
  dark: "mentrixa-spinner--dark",
  workbench: "mentrixa-spinner--workbench",
};

const COPY_STAGGER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const COPY_RISE = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

export function MentrixaSpinner({
  size = "md",
  color = "accent",
  tone = "light",
  brandKind,
  className,
  label,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "current" | "accent" | "success" | "warning" | "danger";
  tone?: MentrixaSpinnerTone;
  brandKind?: MentrixaBrandKind;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("mentrixa-spinner inline-flex items-center gap-2", TONE_CLASS[tone], className)}
      role="status"
      aria-label={label}
    >
      {brandKind ? <MentrixaBrandMark kind={brandKind} size="xs" className="opacity-85" /> : null}
      <Spinner size={size} color={color} className="mentrixa-spinner__icon" aria-hidden />
    </span>
  );
}

export function MentrixaPendingPanel({
  kind,
  tone = "light",
  layout = "stacked",
  loaderSize = "md",
  className,
}: {
  kind: MentrixaSpinnerKind;
  tone?: MentrixaSpinnerTone;
  layout?: "stacked" | "inline";
  loaderSize?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const message = mentrixaSpinnerMessage(kind);

  useEffect(() => {
    playMentrixaLoadingOnce();
  }, []);

  return (
    <div
      className={cn(
        "mentrixa-spinner-panel",
        TONE_CLASS[tone],
        layout === "inline" ? "mentrixa-spinner-panel--inline" : "mentrixa-spinner-panel--stacked gap-5",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label={message.ariaLabel}
    >
      <MentrixaLogoLoader
        size={loaderSize}
        className="mentrixa-spinner-panel__loader shrink-0"
      />
      <motion.div
        className="mentrixa-spinner-panel__copy min-w-0"
        variants={COPY_STAGGER}
        initial="hidden"
        animate="show"
      >
        <motion.p
          variants={COPY_RISE}
          className="mentrixa-spinner-panel__title text-sm font-semibold leading-snug"
        >
          {message.title}
        </motion.p>
        <motion.p
          variants={COPY_RISE}
          className="mentrixa-spinner-panel__description mt-1 text-xs leading-relaxed"
        >
          {message.description}
        </motion.p>
        <motion.p
          variants={COPY_RISE}
          className="mentrixa-spinner-panel__footer mt-2 text-xs leading-relaxed"
        >
          {message.verdict} {message.nextAction}
        </motion.p>
      </motion.div>
    </div>
  );
}

export function StripeCheckoutPendingPanel({
  tone = "light",
  className,
}: {
  tone?: MentrixaSpinnerTone;
  className?: string;
}) {
  return <MentrixaPendingPanel kind="stripe_checkout" tone={tone} className={className} />;
}

export function QuestPackLoadPendingPanel({
  tone = "light",
  loaderSize = "md",
  className,
}: {
  tone?: MentrixaSpinnerTone;
  loaderSize?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <MentrixaPendingPanel
      kind="quest_pack_load"
      tone={tone}
      loaderSize={loaderSize}
      className={className}
    />
  );
}

"use client";

import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";

type Tone = "coach" | "success" | "error" | "neutral";

const TONE_BORDER: Record<Tone, string> = {
  coach: "border-[#6366F1]",
  success: "border-emerald-500",
  error: "border-rose-500",
  neutral: "border-[#A5B4FC]",
};

type Props = {
  message: string;
  tone?: Tone;
  className?: string;
  /** Kept for call-site compatibility — messages render instantly for smooth games. */
  speed?: number;
  label?: string;
};

/** Sticky coach note — no blur / typewriter / framer (keeps games smooth). */
export function LandingSpeechBubble({
  message,
  tone = "coach",
  className,
  label = "Coach",
}: Props) {
  return (
    <div className={cn("lp-speech-bubble relative w-full max-w-md", className)} role="status">
      <LandingStickyNote
        variant="strip"
        className={cn("relative rotate-[-0.35deg] px-4 py-3", TONE_BORDER[tone])}
      >
        {label ? <p className={`mb-1 ${landingHub.eyebrow} text-[10px]`}>{label}</p> : null}
        <p className={`min-h-[2.5rem] text-sm font-semibold leading-snug sm:text-[15px] ${landingHub.body}`}>
          {message}
        </p>
      </LandingStickyNote>
    </div>
  );
}

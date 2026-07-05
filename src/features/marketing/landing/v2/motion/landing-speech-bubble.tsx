"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { TypewriterText } from "@/features/marketing/landing/v2/motion/typewriter-text";
import { springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";

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
  /** Typing speed in ms per char */
  speed?: number;
  label?: string;
};

export function LandingSpeechBubble({
  message,
  tone = "coach",
  className,
  speed = 22,
  label = "Coach",
}: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 12, scale: 0.94, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={springSoft}
        className={cn("lp-speech-bubble relative w-full max-w-md", className)}
        role="status"
      >
        <LandingStickyNote
          variant="strip"
          className={cn("relative rotate-[-0.35deg] px-4 py-3", TONE_BORDER[tone])}
        >
          <p className={`mb-1 ${landingHub.eyebrow} text-[10px]`}>{label}</p>
          <p className={`min-h-[2.75rem] text-sm font-semibold leading-snug sm:text-[15px] ${landingHub.body}`}>
            <TypewriterText text={message} speed={speed} resetKey={message} />
          </p>
        </LandingStickyNote>
      </motion.div>
    </AnimatePresence>
  );
}

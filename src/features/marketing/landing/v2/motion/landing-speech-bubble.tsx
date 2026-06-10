"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { TypewriterText } from "@/features/marketing/landing/v2/motion/typewriter-text";
import { springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";

type Tone = "coach" | "success" | "error" | "neutral";

const TONE_STYLES: Record<Tone, string> = {
  coach: "border-indigo-400/35 bg-indigo-950/80 text-indigo-50 shadow-[0_0_40px_rgba(99,102,241,0.25)]",
  success: "border-emerald-400/40 bg-emerald-950/75 text-emerald-50 shadow-[0_0_40px_rgba(52,211,153,0.2)]",
  error: "border-rose-400/35 bg-rose-950/70 text-rose-50 shadow-[0_0_32px_rgba(244,63,94,0.18)]",
  neutral: "border-white/15 bg-slate-950/85 text-slate-100",
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
        <div
          className={cn(
            "relative rounded-2xl border px-4 py-3 backdrop-blur-md",
            TONE_STYLES[tone],
          )}
        >
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">{label}</p>
          <p className="min-h-[2.75rem] text-sm font-semibold leading-snug sm:text-[15px]">
            <TypewriterText text={message} speed={speed} resetKey={message} />
          </p>
        </div>
        <span
          className="lp-speech-bubble-tail absolute -bottom-2 left-8 h-4 w-4 rotate-45 border-b border-r border-inherit bg-inherit"
          aria-hidden
          style={{
            borderColor: "inherit",
            backgroundColor: tone === "coach" ? "rgb(30 27 75 / 0.8)" : undefined,
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

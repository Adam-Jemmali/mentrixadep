"use client";

import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { TypewriterText } from "@/features/marketing/landing/v2/motion/typewriter-text";
import { easeOutExpo, springBouncy } from "@/features/marketing/landing/v2/motion/landing-motion";
import {
  HeroWaitlistCoachReveal,
  type CoachRevealData,
} from "@/features/marketing/landing/v2/hero/hero-waitlist-coach-reveal";

const ICON_VERSION = "20260410";

type WaitlistRole = "student" | "tutor";

type RoleCopy = {
  headline: string;
  cta: string;
  slides: [string, string, string];
};

type Props = {
  role: WaitlistRole;
  roleCopy: RoleCopy;
  coachReveal: CoachRevealData | null;
  slideIdx: number;
  onSlideIdx: (i: number) => void;
  email: string;
  onEmail: (v: string) => void;
  waitlistRole: WaitlistRole;
  onRole: (r: WaitlistRole) => void;
  loading: boolean;
  message: string | null;
  onSubmit: () => void;
  onReplay: () => void;
};

const popContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const popPiece: Variants = {
  hidden: { opacity: 0, scale: 0.72, y: 28, filter: "blur(10px)" },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { ...springBouncy, duration: 0.55 },
  },
};

function RoleIcon({ role, className = "" }: { role: "mentrixer" | "guide"; className?: string }) {
  return (
    <span className={cn("relative inline-block size-4 shrink-0", className)} aria-hidden>
      <Image
        src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        width={16}
        height={16}
        unoptimized
        className="size-full object-contain"
        sizes="16px"
      />
    </span>
  );
}

export function HeroWaitlistFormPop({
  role,
  roleCopy,
  coachReveal,
  slideIdx,
  onSlideIdx,
  email,
  onEmail,
  waitlistRole,
  onRole,
  loading,
  message,
  onSubmit,
  onReplay,
}: Props) {
  const isTutor = role === "tutor";

  return (
    <motion.div
      variants={popContainer}
      initial="hidden"
      animate="show"
      className="relative"
    >
      <motion.div
        variants={popPiece}
        className={cn(
          "lp-ninja-pop-hero relative overflow-hidden rounded-2xl px-4 py-3.5",
          isTutor
            ? "border-violet-400/35 bg-gradient-to-br from-violet-950/90 via-[#12081f] to-slate-950/90"
            : "border-indigo-400/35 bg-gradient-to-br from-indigo-950/90 via-[#081018] to-slate-950/90",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full blur-2xl",
            isTutor ? "bg-violet-500/30" : "bg-indigo-500/25",
          )}
          aria-hidden
        />
        <h3 className="relative text-base font-black leading-tight tracking-tight text-white sm:text-lg">
          {roleCopy.headline}
        </h3>
        {coachReveal ? <HeroWaitlistCoachReveal data={coachReveal} /> : null}
      </motion.div>

      <motion.div
        variants={popPiece}
        className="lp-ninja-scroll relative mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/50 p-3.5"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={roleCopy.slides[slideIdx]}
            initial={{ opacity: 0, x: 20, skewX: -4 }}
            animate={{ opacity: 1, x: 0, skewX: 0 }}
            exit={{ opacity: 0, x: -20, skewX: 4 }}
            transition={{ duration: 0.32, ease: easeOutExpo }}
            className="relative text-sm font-semibold leading-snug text-white"
          >
            <TypewriterText
              text={roleCopy.slides[slideIdx]!}
              speed={22}
              resetKey={`${role}-${slideIdx}`}
            />
          </motion.p>
        </AnimatePresence>
        <div className="relative mt-3 flex gap-1.5">
          {roleCopy.slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSlideIdx(i)}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === slideIdx
                  ? cn("w-9", isTutor ? "bg-violet-400" : "bg-indigo-400")
                  : "w-2 bg-white/20",
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </motion.div>

      <motion.div variants={popPiece} className="lp-ninja-form-panel relative mt-3 space-y-2.5 rounded-xl p-3.5">
        <label className="sr-only" htmlFor="hero-waitlist-email">
          Email
        </label>
        <input
          id="hero-waitlist-email"
          type="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="you@university or work email"
          className="w-full rounded-lg border-2 border-white/15 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none transition-shadow placeholder:text-slate-400 focus:border-violet-400/60 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.2)]"
        />

        <div className="grid grid-cols-2 gap-2">
          {(["student", "tutor"] as const).map((r) => {
            const active = waitlistRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onRole(r)}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-bold transition-all",
                  active
                    ? "border-white/30 bg-white text-slate-900 shadow-[0_4px_0_#94a3b8]"
                    : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10",
                )}
              >
                <RoleIcon
                  role={r === "student" ? "mentrixer" : "guide"}
                  className={active ? "" : "brightness-0 invert"}
                />
                {r === "student" ? "I want to learn" : "I want to teach"}
              </button>
            );
          })}
        </div>

        <motion.button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98, y: 0 }}
          className="lp-ninja-cta lp-ninja-cta--guide relative flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg px-4 py-3 text-sm font-black uppercase tracking-wide text-white disabled:opacity-60"
        >
          {loading ? "Submitting…" : roleCopy.cta}
        </motion.button>

        {message ? <p className="text-center text-xs text-indigo-200/90">{message}</p> : null}

        <button
          type="button"
          onClick={onReplay}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-slate-500 transition-colors hover:text-violet-200/90"
        >
          <svg className="size-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 12l5-5M4 12l5 5" />
          </svg>
          Play slice game again
        </button>
      </motion.div>
    </motion.div>
  );
}

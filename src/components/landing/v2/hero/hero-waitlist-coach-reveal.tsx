"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { easeOutExpo, springBouncy } from "@/components/landing/v2/motion/landing-motion";

const ICON_VERSION = "20260410";

export type CoachRevealData = {
  sliceCount: number;
  side: "learn" | "teach";
  role: "student" | "tutor";
};

const lineStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const wordPop = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: easeOutExpo },
  },
};

const iconPop = {
  hidden: { opacity: 0, scale: 0, rotate: -20 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: springBouncy,
  },
};

function BadgeIcon({ role, size = 22 }: { role: "mentrixer" | "guide"; size?: number }) {
  return (
    <motion.span variants={iconPop} className="relative inline-flex shrink-0 align-middle">
      <Image
        src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="object-contain drop-shadow-[0_0_10px_rgba(167,139,250,0.45)]"
        sizes={`${size}px`}
      />
    </motion.span>
  );
}

function Highlight({
  children,
  variant,
  className,
}: {
  children: ReactNode;
  variant: "violet" | "indigo";
  className?: string;
}) {
  const styles = {
    violet: "font-black text-violet-400 drop-shadow-[0_0_12px_rgba(167,139,250,0.55)]",
    indigo: "font-black text-indigo-300 drop-shadow-[0_0_12px_rgba(129,140,248,0.5)]",
  };

  return (
    <motion.span
      variants={wordPop}
      className={cn(
        "relative inline-block",
        styles[variant],
        variant === "violet" && "lp-coach-shimmer-violet",
        className,
      )}
    >
      {children}
    </motion.span>
  );
}

export function HeroWaitlistCoachReveal({ data }: { data: CoachRevealData }) {
  const reducedMotion = useReducedMotion();
  const isTutor = data.role === "tutor";
  const count = data.sliceCount;
  const countLabel = count === 1 ? "icon" : "icons";

  if (reducedMotion) {
    return (
      <p className="relative mt-2 flex flex-wrap items-center gap-1.5 text-xs leading-relaxed text-slate-300">
        <BadgeIcon role={isTutor ? "guide" : "mentrixer"} />
        {isTutor ? (
          <>
            You sliced <span className="font-bold text-violet-400">{count}</span> Teach {countLabel}. Apply to{" "}
            <span className="font-bold text-violet-300">guide</span> on Mentrixa.
          </>
        ) : (
          <>
            You sliced <span className="font-bold text-violet-400">{count}</span> Learn {countLabel}. Claim your{" "}
            <span className="font-bold text-indigo-300">Mentrixer</span> spot.
          </>
        )}
      </p>
    );
  }

  return (
    <motion.p
      variants={lineStagger}
      initial="hidden"
      animate="show"
      className="relative mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs leading-relaxed text-slate-300/95 sm:text-[13px]"
    >
      <BadgeIcon role={isTutor ? "guide" : "mentrixer"} size={24} />

      <motion.span variants={wordPop}>You sliced</motion.span>
      <Highlight variant="violet">{count}</Highlight>
      <motion.span variants={wordPop}>{data.side === "learn" ? "Learn" : "Teach"}</motion.span>
      <motion.span variants={wordPop}>{countLabel}.</motion.span>

      {isTutor ? (
        <>
          <motion.span variants={wordPop}>Apply to</motion.span>
          <Highlight variant="violet">
            <span className="inline-flex items-center gap-1">
              <BadgeIcon role="guide" size={18} />
              guide
            </span>
          </Highlight>
          <motion.span variants={wordPop}>on</motion.span>
          <motion.span
            variants={wordPop}
            className="lp-coach-brand font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-indigo-300 to-blue-300"
          >
            Mentrixa
          </motion.span>
        </>
      ) : (
        <>
          <motion.span variants={wordPop}>Claim your</motion.span>
          <Highlight variant="indigo">
            <span className="inline-flex items-center gap-1">
              <BadgeIcon role="mentrixer" size={18} />
              Mentrixer
            </span>
          </Highlight>
          <motion.span variants={wordPop}>spot.</motion.span>
        </>
      )}
    </motion.p>
  );
}

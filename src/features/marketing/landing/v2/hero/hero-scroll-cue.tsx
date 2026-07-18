"use client";

import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { useMounted } from "@/features/marketing/landing/v2/motion/use-mounted";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";

/** CSS bounce cue — no framer-motion / lucide on the hero critical path. */
export function HeroScrollCue() {
  const mounted = useMounted();
  const reduced = usePrefersReducedMotion();
  const { canLoop } = useLandingMotion();

  if (!mounted || reduced || !canLoop) return null;

  return (
    <a
      href="#outcomes"
      className={`lp-scroll-cue absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${landingHub.hint} transition-colors hover:text-[#0B1220]`}
      aria-label="Scroll to see what you get"
    >
      <span>Explore</span>
      <svg className="size-4 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </a>
  );
}

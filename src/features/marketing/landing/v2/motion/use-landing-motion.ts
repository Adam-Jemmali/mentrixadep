"use client";

import { useLowEndMode } from "@/features/marketing/landing-perf";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { useMounted } from "@/features/marketing/landing/v2/motion/use-mounted";
import { springSnappy, springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";

/** Central gate: cinematic = full motion; reduced/low-end = static or minimal. */
export function useLandingMotion() {
  const mounted = useMounted();
  const reducedMotion = usePrefersReducedMotion();
  const lowEnd = useLowEndMode();
  const reduced = reducedMotion === true;
  /** SSR + first paint must stay static to avoid hydration mismatches. */
  const cinematic = mounted && !reduced && !lowEnd;

  return {
    mounted,
    reduced,
    lowEnd,
    cinematic,
    /** Safe to run scroll-linked or infinite loops */
    canLoop: cinematic,
    spring: cinematic ? springSnappy : springSoft,
    hoverScale: cinematic ? 1.03 : 1,
    hoverLift: cinematic ? -8 : -2,
  };
}

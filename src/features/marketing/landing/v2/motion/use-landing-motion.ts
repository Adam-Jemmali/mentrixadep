"use client";

import { useLowEndMode } from "@/features/marketing/landing-perf";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { useMounted } from "@/features/marketing/landing/v2/motion/use-mounted";
import { springSnappy, springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";

/** Central gate: games stay playable; decorative infinite loops only when not low-end. */
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
    /** Decorative loops (glows, rays) — not core game orbit. */
    canLoop: cinematic,
    spring: cinematic ? springSnappy : springSoft,
    hoverScale: cinematic ? 1.03 : 1,
    hoverLift: cinematic ? -6 : 0,
  };
}

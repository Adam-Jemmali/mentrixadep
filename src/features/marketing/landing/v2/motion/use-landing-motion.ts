"use client";

import { useLowEndMode } from "@/features/marketing/landing-perf";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { useMounted } from "@/features/marketing/landing/v2/motion/use-mounted";
import { springSnappy, springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";

/** Central gate: landing stays static by default (low-end / no-GPU). Opt into loops only when clearly capable. */
export function useLandingMotion() {
  const mounted = useMounted();
  const reducedMotion = usePrefersReducedMotion();
  const lowEnd = useLowEndMode();
  const reduced = reducedMotion === true;
  /** No continuous loops on marketing — entry fades only when mounted and not reduced/low-end. */
  const cinematic = mounted && !reduced && !lowEnd;

  return {
    mounted,
    reduced,
    lowEnd,
    cinematic,
    /** Infinite / scroll-linked loops off — biggest lag source on weak GPUs. */
    canLoop: false,
    spring: cinematic ? springSnappy : springSoft,
    hoverScale: cinematic ? 1.02 : 1,
    hoverLift: cinematic ? -4 : 0,
  };
}

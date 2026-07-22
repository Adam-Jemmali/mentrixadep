"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/shared/animation/motion";

/**
 * Motion props that depend on `prefers-reduced-motion` must not diverge between SSR
 * and the first client paint. Until mount, behave as reduced motion.
 */
export function useHydrationSafeMotion() {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prefersReducedMotion = reduceMotion === true;
  const safeReduceMotion = !mounted || prefersReducedMotion;

  return {
    mounted,
    prefersReducedMotion,
    /** True during SSR and first paint so motion props match server HTML. */
    safeReduceMotion,
  };
}

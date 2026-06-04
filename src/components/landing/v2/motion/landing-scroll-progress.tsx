"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useLowEndMode } from "@/lib/landing-perf";
import { useMounted } from "@/components/landing/v2/motion/use-mounted";

export function LandingScrollProgress() {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const lowEnd = useLowEndMode();
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, (v) => v);

  if (!mounted || reduced || lowEnd) {
    return <div className="lp-scroll-progress" style={{ transform: "scaleX(0)" }} aria-hidden />;
  }

  return (
    <motion.div
      className="lp-scroll-progress"
      style={{ scaleX }}
      aria-hidden
    />
  );
}

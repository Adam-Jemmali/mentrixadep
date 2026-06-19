"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { ChevronDown } from "lucide-react";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { useMounted } from "@/features/marketing/landing/v2/motion/use-mounted";

export function HeroScrollCue() {
  const mounted = useMounted();
  const reduced = usePrefersReducedMotion();
  const { canLoop } = useLandingMotion();

  if (!mounted || reduced || !canLoop) return null;

  return (
    <motion.a
      href="#outcomes"
      className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-white"
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      aria-label="Scroll to see what you get"
    >
      <span>Explore</span>
      <ChevronDown className="size-4 opacity-80" aria-hidden />
    </motion.a>
  );
}

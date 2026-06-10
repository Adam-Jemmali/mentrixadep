"use client";

import { motion } from "framer-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

export function HeroLiveBadge() {
  const { canLoop } = useLandingMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/25 bg-emerald-500/[0.08] px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
    >
      <span className="relative flex size-2">
        {canLoop ? (
          <motion.span
            className="absolute inline-flex size-full rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.8, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        ) : null}
        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
        Climbers online now
      </span>
    </motion.div>
  );
}

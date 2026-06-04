"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const BURST_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

type Props = {
  active: boolean;
  accent?: "learn" | "teach";
  className?: string;
};

export function HeroWaitlistSliceBurst({ active, accent = "learn", className }: Props) {
  if (!active) return null;

  const learn = accent === "learn";

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-[80] overflow-hidden rounded-2xl", className)} aria-hidden>
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.55, 0] }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      />
      <motion.div
        className={cn(
          "absolute left-1/2 top-1/2 h-[140%] w-1 -translate-x-1/2 -translate-y-1/2 rotate-[-28deg]",
          learn ? "bg-gradient-to-b from-transparent via-cyan-300 to-transparent" : "bg-gradient-to-b from-transparent via-amber-300 to-transparent",
        )}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: [0, 1, 0] }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className={cn(
          "absolute left-1/2 top-1/2 h-1 w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-[-28deg]",
          learn ? "bg-gradient-to-r from-transparent via-indigo-400 to-transparent" : "bg-gradient-to-r from-transparent via-violet-400 to-transparent",
        )}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: [0, 1, 0] }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      />
      {BURST_ANGLES.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 72;
        return (
          <motion.span
            key={deg}
            className={cn(
              "absolute left-1/2 top-1/2 block h-1 w-10 rounded-full",
              learn ? "bg-cyan-400/90 shadow-[0_0_12px_#22d3ee]" : "bg-amber-400/90 shadow-[0_0_12px_#fbbf24]",
            )}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.6, 2.2],
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
            }}
            transition={{ duration: 0.5, delay: i * 0.015, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={`shard-${i}`}
          className={cn(
            "absolute left-1/2 top-1/2 size-2 rotate-45",
            learn ? "bg-indigo-300" : "bg-violet-300",
          )}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0.4],
            x: Math.cos((i / 8) * Math.PI * 2) * 90,
            y: Math.sin((i / 8) * Math.PI * 2) * 70,
          }}
          transition={{ duration: 0.45, delay: 0.04 + i * 0.02, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

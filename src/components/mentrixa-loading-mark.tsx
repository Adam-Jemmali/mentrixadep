"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Hero-style “M” with radial glow (same structure as landing `page.tsx`), sized for inline loaders. */
export function MentrixaLoadingMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `mentrixa-m-glow-${uid}`;
  const box = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-12 h-12 rounded-xl",
    lg: "w-16 h-16 rounded-2xl",
  }[size];

  return (
    <motion.div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700",
        box,
        className,
      )}
      style={{ boxShadow: "0 0 0 3px rgba(37,99,235,0.2)" }}
      animate={{ y: [0, -4, 0] }}
      transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
      role="status"
      aria-label="Loading"
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill={`url(#${gradientId})`} />
        <text
          x="50%"
          y="54%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-display font-bold"
          fill="white"
          fontSize="140"
          opacity={0.88}
        >
          M
        </text>
      </svg>
    </motion.div>
  );
}

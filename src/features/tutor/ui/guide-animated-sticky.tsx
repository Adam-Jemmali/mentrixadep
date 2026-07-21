"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { GuideStickyNote } from "@/features/tutor/ui/guide-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { cn } from "@/shared/core/utils";

export function GuideAnimatedSticky({
  variant = "curl",
  className,
  children,
  staggerIndex = 0,
  compact = true,
}: {
  variant?: LandingStickyVariant;
  className?: string;
  children: ReactNode;
  staggerIndex?: number;
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="guide-sticky-shell group relative h-full"
      initial={reduceMotion ? false : { opacity: 0, y: 48, rotate: -2, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 22,
        mass: 0.85,
        delay: reduceMotion ? 0 : staggerIndex * 0.1,
      }}
    >
      <GuideStickyNote
        variant={variant}
        compact={compact}
        className={cn("h-full cursor-default will-change-transform", className)}
      >
        {children}
      </GuideStickyNote>
    </motion.div>
  );
}

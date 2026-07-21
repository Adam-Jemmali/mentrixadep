"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { HOME_MOUNT_PANEL_CLASS } from "@/features/student-home/student-home-sticky-card";
import { cn } from "@/shared/core/utils";

export function StudentHomeAnimatedSticky({
  variant = "curl",
  className,
  children,
  staggerIndex = 0,
  compact = false,
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
      className="home-sticky-shell group relative"
      initial={reduceMotion ? false : { opacity: 0, y: 64, rotate: -3, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        mass: 0.9,
        delay: reduceMotion ? 0 : staggerIndex * 0.12,
      }}
    >
      <StudentStickyNote
        variant={variant}
        compact={compact}
        className={cn(
          HOME_MOUNT_PANEL_CLASS,
          "cursor-default will-change-transform",
          className,
        )}
      >
        {children}
      </StudentStickyNote>
    </motion.div>
  );
}

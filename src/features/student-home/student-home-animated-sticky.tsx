"use client";

import { type ReactNode, useEffect } from "react";
import { motion, useAnimationControls } from "@/shared/animation/motion";
import { useHydrationSafeMotion } from "@/shared/animation/use-hydration-safe-motion";
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
  const { mounted, prefersReducedMotion } = useHydrationSafeMotion();
  const controls = useAnimationControls();

  useEffect(() => {
    if (!mounted) return;

    const visible = { opacity: 1, y: 0, rotate: 0, scale: 1 };
    if (prefersReducedMotion) {
      void controls.set(visible);
      return;
    }

    controls.set({ opacity: 0, y: 64, rotate: -3, scale: 0.88 });
    void controls.start({
      ...visible,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        mass: 0.9,
        delay: staggerIndex * 0.12,
      },
    });
  }, [controls, mounted, prefersReducedMotion, staggerIndex]);

  return (
    <motion.div
      className="home-sticky-shell group relative"
      initial={false}
      animate={
        mounted
          ? controls
          : { opacity: 1, y: 0, rotate: 0, scale: 1 }
      }
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

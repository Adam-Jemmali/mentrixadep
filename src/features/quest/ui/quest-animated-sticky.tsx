"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { cn } from "@/shared/core/utils";

export const QUEST_MOUNT_PANEL_CLASS = "quest-mount-panel";

export function QuestAnimatedSticky({
  variant = "taped",
  className,
  children,
}: {
  variant?: LandingStickyVariant;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="quest-sticky-shell group relative"
      initial={reduceMotion ? false : { opacity: 0, y: 48, rotate: -2, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22, mass: 0.85 }}
    >
      <StudentStickyNote
        variant={variant}
        className={cn(QUEST_MOUNT_PANEL_CLASS, "w-full touch-pan-y will-change-transform", className)}
      >
        {children}
      </StudentStickyNote>
    </motion.div>
  );
}

/** GSAP timeline when quest run mounts or question changes. */
export function useQuestRunEntry(active: boolean, questionKey: string): void {
  const reduceMotion = useReducedMotion();

  useGsapEffect(
    (gsap) => {
      if (!active || reduceMotion) return;

      const header = document.querySelector(".quest-header");
      const bar = document.querySelector(".quest-progress-bar");
      const card = document.querySelector(".quest-question-card");
      if (!header && !bar && !card) return;

      const tl = gsap.timeline();
      if (header) {
        tl.from(header, { y: -20, opacity: 0, duration: 0.4, ease: "power2.out" });
      }
      if (bar) {
        tl.from(
          bar,
          { scaleX: 0, duration: 0.5, ease: "power3.out", transformOrigin: "left" },
          header ? "-=0.2" : 0,
        );
      }
      if (card) {
        tl.from(
          card,
          { y: 30, opacity: 0, duration: 0.5, ease: "back.out(1.4)" },
          "-=0.1",
        );
      }

      return () => {
        tl.kill();
      };
    },
    [active, questionKey, reduceMotion],
  );
}

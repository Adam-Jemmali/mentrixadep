"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { cn } from "@/shared/core/utils";

export const QUEST_MOUNT_PANEL_CLASS = "quest-mount-panel";

const STICKY_SHADOW_REST =
  "2px 4px 0 rgba(11,18,32,0.14), 4px 10px 22px -8px rgba(11,18,32,0.28)";
const STICKY_SHADOW_HOVER =
  "4px 14px 0 rgba(11,18,32,0.1), 8px 28px 36px -6px rgba(124,58,237,0.32)";

export function QuestAnimatedSticky({
  variant = "taped",
  className,
  children,
}: {
  variant?: LandingStickyVariant;
  className?: string;
  children: ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useGsapEffect(
    (gsap) => {
      const shell = shellRef.current;
      if (!shell || reduceMotion) return;

      const note = shell.querySelector<HTMLElement>(".lp-sticky-note");
      if (!note) return;

      gsap.set(note, { transformOrigin: "50% 85%", boxShadow: STICKY_SHADOW_REST });

      const onEnter = () => {
        gsap.to(note, {
          y: -10,
          rotate: -1.5,
          scale: 1.02,
          duration: 0.38,
          ease: "power3.out",
          boxShadow: STICKY_SHADOW_HOVER,
        });
      };
      const onLeave = () => {
        gsap.to(note, {
          y: 0,
          rotate: 0,
          scale: 1,
          duration: 0.48,
          ease: "power2.out",
          boxShadow: STICKY_SHADOW_REST,
        });
      };

      shell.addEventListener("mouseenter", onEnter);
      shell.addEventListener("mouseleave", onLeave);

      return () => {
        shell.removeEventListener("mouseenter", onEnter);
        shell.removeEventListener("mouseleave", onLeave);
        gsap.killTweensOf(note);
      };
    },
    [reduceMotion],
  );

  return (
    <motion.div
      ref={shellRef}
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

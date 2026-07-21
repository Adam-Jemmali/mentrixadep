"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { HOME_MOUNT_PANEL_CLASS } from "@/features/student-home/student-home-sticky-card";
import { cn } from "@/shared/core/utils";

const STICKY_SHADOW_REST =
  "2px 4px 0 rgba(11,18,32,0.14), 4px 10px 22px -8px rgba(11,18,32,0.28)";
const STICKY_SHADOW_HOVER =
  "4px 14px 0 rgba(11,18,32,0.1), 8px 28px 36px -6px rgba(124,58,237,0.3)";

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
          y: -12,
          rotate: -2,
          scale: 1.025,
          duration: 0.42,
          ease: "power3.out",
          boxShadow: STICKY_SHADOW_HOVER,
        });
      };
      const onLeave = () => {
        gsap.to(note, {
          y: 0,
          rotate: 0,
          scale: 1,
          duration: 0.55,
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

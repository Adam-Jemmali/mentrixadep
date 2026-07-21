"use client";

import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { HOME_MOUNT_PANEL_CLASS } from "@/features/student-home/student-home-sticky-card";

/** Stagger paper stickies on first paint — edtech-style desk reveal. */
export function useStudentHomeMount(): void {
  useGsapEffect((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const panels = gsap.utils.toArray<HTMLElement>(`.${HOME_MOUNT_PANEL_CLASS}`);
    if (panels.length === 0) return;

    gsap.set(panels, { opacity: 0, y: 32, rotate: 0 });

    const tween = gsap.to(panels, {
      opacity: 1,
      y: 0,
      rotate: () => gsap.utils.random(-1.6, 1.6),
      duration: 0.62,
      stagger: 0.09,
      ease: "back.out(1.35)",
    });

    return () => {
      tween.kill();
    };
  }, []);
}

"use client";

import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { HOME_MOUNT_PANEL_CLASS } from "@/features/student-home/student-home-sticky-card";

/** Stagger paper stickies on first paint — edtech-style desk reveal. */
export function useStudentHomeMount(): void {
  useGsapEffect((gsap) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const panels = gsap.utils.toArray<HTMLElement>(`.${HOME_MOUNT_PANEL_CLASS}`);
    if (panels.length === 0) return;

    gsap.set(panels, { opacity: 0, y: 40, rotate: 0, scale: 0.98 });

    const tween = gsap.to(panels, {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: () => gsap.utils.random(-2, 2),
      duration: 0.72,
      stagger: {
        each: 0.1,
        from: "start",
        ease: "power2.out",
      },
      ease: "back.out(1.25)",
    });

    return () => {
      tween.kill();
    };
  }, []);
}

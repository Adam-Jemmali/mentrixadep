"use client";

import type { RefObject } from "react";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { LP_NUM } from "@/features/marketing/landing/ui/landing-number-motion-pure";

type Options = {
  start?: string;
  animateValues?: boolean;
  immediate?: boolean;
};

export function useLandingNumericReveal(
  rootRef: RefObject<HTMLElement | null>,
  options: Options = {},
): void {
  const { start = "top 78%", animateValues = false, immediate = false } = options;

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const root = rootRef.current;
      if (!root) return;

      const cards = root.querySelectorAll(`.${LP_NUM.card}`);
      const watermarks = root.querySelectorAll(`.${LP_NUM.watermark}`);
      const titleNums = root.querySelectorAll(`.${LP_NUM.title}`);
      const values = root.querySelectorAll(`.${LP_NUM.value}`);

      if (!cards.length && !titleNums.length && !values.length) return;

      if (cards.length) gsap.set(cards, { y: 28, opacity: 0 });
      if (watermarks.length) gsap.set(watermarks, { scale: 0.35, opacity: 0, rotate: -8 });
      if (titleNums.length) gsap.set(titleNums, { scale: 0.5, opacity: 0, y: 12 });
      if (animateValues && values.length) gsap.set(values, { scale: 0.85, opacity: 0, y: 8 });

      let revealed = false;
      const reveal = () => {
        if (revealed) return;
        revealed = true;

        if (titleNums.length) {
          gsap.to(titleNums, {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "back.out(1.8)",
            stagger: 0.06,
          });
        }

        if (cards.length) {
          gsap.to(cards, {
            y: 0,
            opacity: 1,
            stagger: 0.12,
            duration: 0.55,
            ease: "power2.out",
            delay: 0.06,
          });
        }

        if (watermarks.length) {
          gsap.to(watermarks, {
            scale: 1,
            opacity: 1,
            rotate: 0,
            stagger: 0.12,
            duration: 0.5,
            ease: "back.out(1.7)",
            delay: 0.18,
          });
        }

        if (animateValues && values.length) {
          gsap.to(values, {
            scale: 1,
            opacity: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.45,
            ease: "back.out(1.6)",
            delay: 0.28,
          });
        }
      };

      if (immediate) {
        reveal();
        return;
      }

      const trigger = ScrollTrigger.create({
        trigger: root,
        start,
        once: true,
        onEnter: reveal,
      });

      ScrollTrigger.refresh();
      if (trigger.progress > 0) {
        reveal();
      }

      return () => {
        trigger.kill();
      };
    },
    [animateValues, immediate, rootRef, start],
  );
}

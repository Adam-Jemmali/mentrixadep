"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";

type Props = {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
};

/** Anime.js — each word fades + slides up, 40ms stagger, ~800ms total. */
export function HeroSentenceAnimate({ children, className, ariaLabel }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = headingRef.current;
    if (!root) return;

    const words = root.querySelectorAll<HTMLElement>(".hero-word");
    if (reducedMotion) {
      words.forEach((word) => {
        word.style.opacity = "1";
        word.style.transform = "none";
      });
      return;
    }

    let cancelled = false;

    void import("@/shared/animation/anime").then(({ animate, stagger }) => {
      if (cancelled) return;
      animate(words, {
        opacity: [0, 1],
        translateY: ["0.75rem", 0],
        duration: 360,
        delay: stagger(40),
        ease: "outExpo",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  return (
    <h1 ref={headingRef} className={className} aria-label={ariaLabel}>
      {children}
    </h1>
  );
}

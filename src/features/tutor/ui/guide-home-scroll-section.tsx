"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/shared/animation/motion";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { cn } from "@/shared/core/utils";

export function GuideHomeScrollSection({
  children,
  className,
  id,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  index?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useGsapScrollTriggerEffect((gsap, ScrollTrigger) => {
    const el = ref.current;
    if (!el || reduceMotion) return;

    const tween = gsap.from(el, {
      y: 40,
      opacity: 0,
      rotate: index % 2 === 0 ? -0.8 : 0.8,
      duration: 0.62,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      ScrollTrigger.refresh();
    };
  }, [index, reduceMotion]);

  return (
    <section ref={ref} id={id} className={cn("opacity-100", className)}>
      {children}
    </section>
  );
}

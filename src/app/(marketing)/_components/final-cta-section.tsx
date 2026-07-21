"use client";

import Link from "next/link";
import { useRef } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

export function FinalCtaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const section = sectionRef.current;
      if (!section || reduceMotion) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
        },
      });

      tl.from(section.querySelector(".final-cta-copy"), {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
      }).from(
        section.querySelector(".final-cta-actions"),
        { y: 16, opacity: 0, duration: 0.45, ease: "power2.out" },
        "-=0.2",
      );

      return () => {
        tl.kill();
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === section) t.kill();
        });
      };
    },
    [reduceMotion],
  );

  return (
    <section
      ref={sectionRef}
      className="relative border-t border-white/[0.06] bg-[var(--mx-navy-2)] px-4 py-24 sm:px-6"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="final-cta-copy font-[family-name:var(--font-playfair)] text-[clamp(1.75rem,4vw,2.35rem)] font-bold leading-tight text-white">
          Your score starts at zero. Every answer moves it.
        </h2>

        <div className="final-cta-actions mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/try"
            prefetch={false}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--mx-violet)] px-6 py-3",
              "text-sm font-bold text-white hover:bg-[var(--mx-primary-hover)]",
            )}
          >
            Find out what you don&apos;t know
            <IconArrowRight size={16} stroke={2.2} aria-hidden />
          </Link>
          <Link
            href="/auth/signup?role=tutor"
            prefetch={false}
            className={cn(
              "inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3",
              "text-sm font-semibold text-white/70 hover:text-white",
            )}
          >
            Earn as a Guide
          </Link>
        </div>
      </div>
    </section>
  );
}

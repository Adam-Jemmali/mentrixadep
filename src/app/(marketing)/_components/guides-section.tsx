"use client";

import Link from "next/link";
import { useRef } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

export function GuidesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const section = sectionRef.current;
      if (!section || reduceMotion) return;

      gsap.from(section.querySelector(".guides-panel"), {
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
        },
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      });

      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === section) t.kill();
        });
      };
    },
    [reduceMotion],
  );

  return (
    <section
      id="guides"
      ref={sectionRef}
      className="relative border-t border-white/[0.06] bg-[var(--surface-base)] px-4 py-20 sm:px-6"
    >
      <div className="guides-panel mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <MentrixaVocabIcon name="impact-score" size={20} surface="dark" title="" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--mx-violet)]">
              For Guides
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
            Teach live. Impact Score follows first-attempt movement.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
            Guides earn from sessions and build proof from student outcomes, not star ratings.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--mx-violet)]/20 bg-[var(--mx-violet)]/10 p-6">
          <p className="text-sm text-white/70">
            Stripe payouts, session studio, and a public Impact Score on your profile.
          </p>
          <Link
            href="/auth/signup?role=tutor"
            prefetch={false}
            className={cn(
              "mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5",
              "text-sm font-bold text-white transition-colors hover:border-white/30",
            )}
          >
            Earn as a Guide
            <IconArrowRight size={16} stroke={2.2} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

const STEPS = [
  {
    icon: "verified" as const,
    title: "Answer once",
    body: "Your first try on a skill node locks forever. That score is the only one that counts.",
  },
  {
    icon: "leaderboard" as const,
    title: "Watch the board",
    body: "Real first attempts stream live. No replays. No inflated scores.",
  },
  {
    icon: "rank-proof" as const,
    title: "Move your rank",
    body: "Climb against real people or teach and earn a Guide Impact Score.",
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const section = sectionRef.current;
      if (!section || reduceMotion) return;

      const cards = section.querySelectorAll(".how-step");
      gsap.from(cards, {
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
        },
        y: 24,
        opacity: 0,
        duration: 0.55,
        stagger: 0.12,
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
      id="how-it-works"
      ref={sectionRef}
      className="relative border-t border-white/[0.06] bg-[var(--surface-base)] px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">How it works</h2>
        <p className="mt-2 max-w-lg text-sm text-white/55">
          One skill live today. Same proof bar for every skill we add next.
        </p>

        <ol className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="how-step rounded-[var(--radius-lg)] border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <div className="flex items-center gap-2">
                <MentrixaVocabIcon name={step.icon} size={18} surface="dark" title="" />
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/35">
                  Step {index + 1}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

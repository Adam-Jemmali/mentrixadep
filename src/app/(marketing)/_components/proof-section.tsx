"use client";

import { useRef } from "react";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import type { LandingStatItem } from "@/features/marketing/landing-stats";

type ProofSectionProps = {
  stats: LandingStatItem[];
};

export function ProofSection({ stats }: ProofSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const section = sectionRef.current;
      if (!section || reduceMotion) return;

      section.querySelectorAll<HTMLElement>(".proof-stat-value").forEach((el) => {
        const end = Number(el.dataset.value ?? "0");
        const obj = { val: 0 };
        gsap.to(obj, {
          val: end,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
          onUpdate: () => {
            el.textContent = Math.round(obj.val).toLocaleString();
          },
        });
      });

      gsap.from(section.querySelectorAll(".proof-stat"), {
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
        },
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
      });

      return () => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === section || section.contains(t.trigger as Node)) t.kill();
        });
      };
    },
    [reduceMotion, stats],
  );

  return (
    <section
      id="proof"
      ref={sectionRef}
      className="relative border-t border-white/[0.06] bg-[var(--mx-navy-2)] px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">The proof</h2>
        <p className="mt-2 max-w-lg text-sm text-white/55">
          Numbers from the platform. Updated every few minutes.
        </p>

        <dl className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="proof-stat rounded-[var(--radius-lg)] border border-white/[0.08] bg-black/20 px-5 py-6"
            >
              <dt className="text-sm text-white/50">{stat.label}</dt>
              <dd className="mt-2 flex items-baseline gap-1">
                <span
                  className="proof-stat-value text-3xl font-bold tabular-nums text-white"
                  data-value={stat.value}
                >
                  {reduceMotion ? stat.value.toLocaleString() : "0"}
                </span>
                {stat.suffix ? (
                  <span className="text-sm font-semibold text-white/50">{stat.suffix}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import type { LandingStatItem } from "@/features/marketing/landing-stats";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";
import {
  LandingSectionHeader,
  LandingStickyCard,
} from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

const PROOF_ICONS = ["leaderboard", "flow-meet", "rank-proof"] as const;

type Props = {
  stats: LandingStatItem[];
};

/** Section C — platform numbers with Anime.js counter on scroll. */
export function LandingProofSection({ stats }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const root = sectionRef.current;
      if (!root) return;

      const cards = root.querySelectorAll(".lp-proof-card");
      gsap.set(cards, { y: 24, opacity: 0 });

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top 75%",
        once: true,
        onEnter: () => {
          gsap.to(cards, {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.5,
            ease: "power2.out",
          });
        },
      });

      return () => trigger.kill();
    },
    [],
  );

  useEffect(() => {
    const root = sectionRef.current;
    if (!root || reducedMotion) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer?.disconnect();

        void import("@/shared/animation/anime").then(({ animate }) => {
          if (cancelled) return;
          root.querySelectorAll<HTMLElement>(".lp-proof-value").forEach((el) => {
            const end = Number(el.dataset.value ?? 0);
            const obj = { val: 0 };
            animate(obj, {
              val: end,
              duration: 1.2,
              ease: "outExpo",
              onUpdate: () => {
                el.textContent = Math.round(obj.val).toLocaleString();
              },
            });
          });
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(root);

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [reducedMotion, stats]);

  const { proof } = LANDING_E;

  return (
    <section id="proof" ref={sectionRef} className={landingHub.section}>
      <div className={landingHub.sectionInner}>
        <LandingSectionHeader
          eyebrow={proof.eyebrow}
          title={proof.title}
          subtitle={proof.subtitle}
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <LandingStickyCard
              key={stat.label}
              variant={landingStickyVariantForIndex(index + 2)}
              className={cn(
                "lp-proof-card text-center opacity-0",
                index === 1 && "rotate-[0.4deg]",
              )}
            >
              <div className="mx-auto flex justify-center">
                <MentrixaVocabIcon
                  name={PROOF_ICONS[index] ?? "verified"}
                  size={20}
                  surface="light"
                  title={stat.label}
                />
              </div>
              <p
                className="lp-proof-value lp-sticky-word mt-3 tabular-nums"
                data-value={stat.value}
              >
                {reducedMotion ? stat.value.toLocaleString() : "0"}
                {stat.suffix ?? ""}
              </p>
              <p className={cn(landingHub.bodySm, "mt-2")}>{stat.label}</p>
            </LandingStickyCard>
          ))}
        </div>
      </div>
    </section>
  );
}

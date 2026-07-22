"use client";

import { useEffect, useRef } from "react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import type { LandingStatItem } from "@/features/marketing/landing-stats";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";
import { LandingNumberHeading, LandingNumberWatermark } from "@/features/marketing/landing/ui/landing-number-heading";
import { LP_NUM, LP_NUM_STAT_VALUE_CLASS } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { useLandingNumericReveal } from "@/features/marketing/landing/ui/use-landing-numeric-reveal";
import { LandingRoleText } from "@/features/marketing/landing/ui/landing-role-text";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

const PROOF_ICONS = ["leaderboard", "flow-meet", "rank-proof"] as const;

type Props = {
  stats: LandingStatItem[];
};

/** Live platform stats — numbered cards with count up. */
export function LandingProofSection({ stats }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  useLandingNumericReveal(sectionRef, { start: "top 75%", animateValues: true });

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
          root.querySelectorAll<HTMLElement>(`.${LP_NUM.value}`).forEach((el) => {
            const end = Number(el.dataset.value ?? 0);
            const suffix = el.dataset.suffix ?? "";
            const obj = { val: 0 };
            animate(obj, {
              val: end,
              duration: 1.2,
              ease: "outExpo",
              onUpdate: () => {
                el.textContent = `${Math.round(obj.val).toLocaleString()}${suffix}`;
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
    <section id="proof" ref={sectionRef} className={landingHub.sectionTight}>
      <div className={landingHub.sectionInner}>
        <LandingNumberHeading
          eyebrow={proof.eyebrow}
          count={stats.length}
          suffix="live signals"
          subtitle={proof.subtitle}
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {stats.map((stat, index) => {
            const num = String(index + 1);
            return (
              <LandingStickyCard
                key={stat.label}
                variant={landingStickyVariantForIndex(index + 2)}
                className={cn(
                  LP_NUM.card,
                  "relative text-center opacity-0",
                  index === 1 && "rotate-[0.4deg]",
                )}
              >
                <LandingNumberWatermark value={num} />
                <div className="relative mx-auto flex justify-center">
                  <MentrixaVocabIcon
                    name={PROOF_ICONS[index] ?? "verified"}
                    size={32}
                    surface="light"
                    title={stat.label}
                  />
                </div>
                <p
                  className={LP_NUM_STAT_VALUE_CLASS}
                  data-value={stat.value}
                  data-suffix={stat.suffix ?? ""}
                >
                  {reducedMotion
                    ? `${stat.value.toLocaleString()}${stat.suffix ?? ""}`
                    : `0${stat.suffix ?? ""}`}
                </p>
                <p className={cn(landingHub.bodySm, "mt-2")}>
                  <span className="sr-only">Signal {num}. </span>
                  <LandingRoleText text={stat.label} iconSize="sm" />
                </p>
              </LandingStickyCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

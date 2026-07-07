"use client";

import { useRef } from "react";
import { TimelineContent } from "@/shared/ui/timeline-animation";
import { VerticalCutReveal } from "@/shared/ui/vertical-cut-reveal";
import {
  LANDING_PRICING,
} from "@/features/marketing/landing/landing-copy-pure";
import { MOMENTUM_PACKAGE_SUMMARY, BEAT_LINE_SUMMARY } from "@/features/pricing/pricing-tiers-pure";
import { TierComparisonTable } from "@/features/pricing/ui/tier-comparison-table";
import { PricingTierVisualGrid } from "@/features/pricing/ui/pricing-tier-visual";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";

export default function PricingSection() {
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.1, duration: 0.36 },
    }),
    hidden: { y: 12, opacity: 0 },
  };

  return (
    <section
      className={`${landingHub.section} mx-auto min-h-screen max-w-7xl overflow-hidden px-4`}
      id="pricing"
      ref={pricingRef}
    >
      <LandingStickyCard rotate={false} variant="taped" className="mx-auto mb-14 max-w-3xl rotate-[0.2deg] space-y-3 text-center">
        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className={landingHub.eyebrow}
        >
          {LANDING_PRICING.eyebrow}
        </TimelineContent>

        <h2 className={landingHub.title}>
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.1}
            staggerFrom="first"
            reverse
            containerClassName="justify-center"
            transition={{ type: "spring", stiffness: 250, damping: 40 }}
          >
            {LANDING_PRICING.headline}
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className={landingHub.body}
        >
          {LANDING_PRICING.subhead}
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className={`text-sm font-semibold ${landingHub.inkMuted}`}
        >
          {LANDING_PRICING.verdict}
        </TimelineContent>
      </LandingStickyCard>

      <TimelineContent
        as="div"
        animationNum={3}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <LandingStickyCard rotate className="mx-auto max-w-5xl rotate-[-0.25deg] py-6">
          <PricingTierVisualGrid iconSize={88} showCta surface="light" className="relative py-4" />
        </LandingStickyCard>
      </TimelineContent>

      <TimelineContent
        as="div"
        animationNum={5}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <LandingStickyCard rotate={false} className="mx-auto mt-10 max-w-3xl rotate-[0.1deg] px-5 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#22D3EE]">The Beat Line · Arena + Momentum</p>
          <p className={`mt-2 text-sm font-semibold ${landingHub.inkMuted}`}>{BEAT_LINE_SUMMARY}</p>
        </LandingStickyCard>
      </TimelineContent>

      <TimelineContent
        as="div"
        animationNum={5.5}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <LandingStickyCard rotate={false} className="mx-auto mt-6 max-w-3xl rotate-[-0.1deg] px-5 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6366F1]">Momentum includes</p>
          <p className={`mt-2 text-sm font-semibold ${landingHub.inkMuted}`}>{MOMENTUM_PACKAGE_SUMMARY}</p>
        </LandingStickyCard>
      </TimelineContent>

      <TimelineContent
        as="div"
        animationNum={6}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <LandingStickyCard rotate={false} className="mx-auto mt-16 max-w-5xl rotate-[0.15deg] p-4 sm:p-6">
          <TierComparisonTable variant="light" className="relative" />
        </LandingStickyCard>
      </TimelineContent>
    </section>
  );
}

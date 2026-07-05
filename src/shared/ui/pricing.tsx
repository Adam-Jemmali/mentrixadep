"use client";

import { useRef } from "react";
import { TimelineContent } from "@/shared/ui/timeline-animation";
import { VerticalCutReveal } from "@/shared/ui/vertical-cut-reveal";
import {
  PRICING_SECTION_HEADLINE,
  PRICING_SECTION_SUBHEAD,
  PRICING_SECTION_VERDICT,
} from "@/features/pricing/pricing-tiers-pure";
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
      <LandingStickyCard rotate={false} className="mx-auto mb-14 max-w-3xl rotate-[0.2deg] space-y-3 text-center">
        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className={landingHub.eyebrow}
        >
          Pricing
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
            {PRICING_SECTION_HEADLINE}
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className={landingHub.body}
        >
          {PRICING_SECTION_SUBHEAD}
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className={`text-sm font-semibold ${landingHub.inkMuted}`}
        >
          {PRICING_SECTION_VERDICT}
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

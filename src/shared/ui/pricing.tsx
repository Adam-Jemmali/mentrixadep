"use client";

import { useRef } from "react";
import { TimelineContent } from "@/shared/ui/timeline-animation";
import {
  LANDING_PRICING,
} from "@/features/marketing/landing/landing-copy-pure";
import { buildPricingTiers, BEAT_LINE_SUMMARY } from "@/features/pricing/pricing-tiers-pure";
import { TierComparisonTable } from "@/features/pricing/ui/tier-comparison-table";
import { PricingTierVisualCard } from "@/features/pricing/ui/pricing-tier-visual";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { LandingNumberHeading, LandingNumberWatermark } from "@/features/marketing/landing/ui/landing-number-heading";
import { LP_NUM } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { useLandingNumericReveal } from "@/features/marketing/landing/ui/use-landing-numeric-reveal";
import { LandingEyebrow } from "@/features/marketing/landing/ui/landing-eyebrow";
import { LandingRoleText } from "@/features/marketing/landing/ui/landing-role-text";
import { cn } from "@/shared/core/utils";

export default function PricingSection() {
  const pricingRef = useRef<HTMLDivElement>(null);
  const tiers = buildPricingTiers();
  useLandingNumericReveal(pricingRef);

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
          as="div"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="flex justify-center"
        >
          <LandingEyebrow text={LANDING_PRICING.eyebrow} />
        </TimelineContent>

        <LandingNumberHeading count={tiers.length} suffix="tiers" />

        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className={landingHub.body}
        >
          <LandingRoleText text={LANDING_PRICING.subhead} iconSize="sm" />
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className={`text-sm font-semibold ${landingHub.inkMuted}`}
        >
          <LandingRoleText text={LANDING_PRICING.verdict} iconSize="sm" />
        </TimelineContent>
      </LandingStickyCard>

      <TimelineContent
        as="div"
        animationNum={3}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <LandingStickyCard rotate className="mx-auto max-w-5xl rotate-[-0.25deg] py-6">
          <div className="relative grid gap-6 py-4 sm:grid-cols-3">
            {tiers.map((tier, index) => (
              <LandingStickyCard
                key={tier.id}
                rotate={index % 2 === 0}
                variant="curl"
                className={cn(
                  LP_NUM.card,
                  "relative overflow-hidden opacity-0",
                  index === 1 && "rotate-[0.35deg]",
                )}
              >
                <LandingNumberWatermark value={index + 1} />
                <PricingTierVisualCard tier={tier} iconSize={88} showCta surface="light" />
              </LandingStickyCard>
            ))}
          </div>
        </LandingStickyCard>
      </TimelineContent>

      <TimelineContent
        as="div"
        animationNum={5}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <LandingStickyCard rotate={false} className="mx-auto mt-10 max-w-3xl rotate-[0.1deg] px-5 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#22D3EE]">Beat Line</p>
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6366F1]">Momentum</p>
         
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

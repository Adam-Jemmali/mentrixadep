"use client";

import { useRef } from "react";
import { TimelineContent } from "@/shared/ui/timeline-animation";
import { VerticalCutReveal } from "@/shared/ui/vertical-cut-reveal";
import { ArenaMeshBackground } from "@/features/marketing/landing/v2/backgrounds/arena-mesh-background";
import {
  PRICING_SECTION_HEADLINE,
  PRICING_SECTION_SUBHEAD,
  PRICING_SECTION_VERDICT,
} from "@/features/pricing/pricing-tiers-pure";
import { TierComparisonTable } from "@/features/pricing/ui/tier-comparison-table";
import { PricingTierVisualGrid } from "@/features/pricing/ui/pricing-tier-visual";

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
      className="relative mx-auto min-h-screen max-w-7xl overflow-hidden px-4 py-24"
      id="pricing"
      ref={pricingRef}
    >
      <ArenaMeshBackground variant="section" />

      <article className="relative mx-auto mb-14 max-w-3xl space-y-3 text-center">
        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300"
        >
          Pricing
        </TimelineContent>

        <h2 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
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
          className="text-base text-violet-200/90 md:text-lg"
        >
          {PRICING_SECTION_SUBHEAD}
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-sm font-medium text-indigo-200/90"
        >
          {PRICING_SECTION_VERDICT}
        </TimelineContent>
      </article>

      <TimelineContent
        as="div"
        animationNum={3}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <PricingTierVisualGrid iconSize={88} showCta className="relative py-4" />
      </TimelineContent>

      <p className="relative mt-10 text-center text-[10px] font-medium tracking-wide text-violet-300/50">
        Built from the Mentrixa M mark
      </p>

      <TimelineContent
        as="div"
        animationNum={6}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <TierComparisonTable variant="dark" className="relative mt-16" />
      </TimelineContent>
    </section>
  );
}

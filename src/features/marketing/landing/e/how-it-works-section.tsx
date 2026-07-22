"use client";

import { useRef } from "react";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { LandingNumberHeading, LandingNumberWatermark } from "@/features/marketing/landing/ui/landing-number-heading";
import { LP_NUM } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { useLandingNumericReveal } from "@/features/marketing/landing/ui/use-landing-numeric-reveal";
import { LandingRoleText } from "@/features/marketing/landing/ui/landing-role-text";
import { LandingVocabWord } from "@/features/marketing/landing/ui/landing-vocab-word";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { cn } from "@/shared/core/utils";

/** 3 numbered steps with shared numeric scroll reveal. */
export function LandingHowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useLandingNumericReveal(sectionRef);
  const { howItWorks } = LANDING_E;

  return (
    <section id="how-it-works" ref={sectionRef} className={landingHub.sectionTight}>
      <div className={landingHub.sectionInner}>
        <LandingNumberHeading
          eyebrow={howItWorks.eyebrow}
          count={howItWorks.steps.length}
          suffix="steps"
        />

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:gap-5">
          {howItWorks.steps.map((step, index) => (
            <LandingStickyCard
              key={step.number}
              variant={landingStickyVariantForIndex(index)}
              className={cn(
                LP_NUM.card,
                "relative h-full flex-1 overflow-hidden opacity-0",
                index % 2 === 1 && "rotate-[0.35deg]",
              )}
            >
              <LandingNumberWatermark value={step.number} />

              <div className="relative">
                <LandingVocabWord
                  word={step.title}
                  icon={step.vocabIcon}
                  prefix={`${step.number}.`}
                  gold={step.vocabIcon === "verified"}
                  size="xl"
                />
              </div>
              <p className={cn(landingHub.body, "relative mt-3")}>
                <span className="sr-only">Step {step.number}. </span>
                <LandingRoleText text={step.line} iconSize="sm" />
              </p>
            </LandingStickyCard>
          ))}
        </div>
      </div>
    </section>
  );
}

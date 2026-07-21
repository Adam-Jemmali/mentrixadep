"use client";

import { useRef } from "react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";
import {
  LandingSectionHeader,
  LandingStickyCard,
} from "@/features/marketing/landing/ui/landing-section-shell";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { cn } from "@/shared/core/utils";

/** Section B — three steps, sticky notes, GSAP scroll stagger. */
export function LandingHowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const root = sectionRef.current;
      if (!root) return;

      const cards = root.querySelectorAll(".lp-how-step");
      if (!cards.length) return;

      gsap.set(cards, { y: 28, opacity: 0 });

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top 78%",
        once: true,
        onEnter: () => {
          gsap.to(cards, {
            y: 0,
            opacity: 1,
            stagger: 0.12,
            duration: 0.55,
            ease: "power2.out",
          });
        },
      });

      return () => {
        trigger.kill();
      };
    },
    [],
  );

  const { howItWorks } = LANDING_E;

  return (
    <section id="how-it-works" ref={sectionRef} className={landingHub.section}>
      <div className={landingHub.sectionInner}>
        <LandingSectionHeader
          eyebrow={howItWorks.eyebrow}
          title={howItWorks.title}
        />

        <div className="mt-10 flex flex-col gap-5 lg:flex-row lg:gap-6">
          {howItWorks.steps.map((step, index) => (
            <LandingStickyCard
              key={step.title}
              variant={landingStickyVariantForIndex(index)}
              className={cn(
                "lp-how-step h-full flex-1 opacity-0",
                index % 2 === 1 && "rotate-[0.35deg]",
              )}
            >
              <div className="flex items-center gap-2.5">
                <LandingStickyNote
                  compact
                  variant="strip"
                  className="flex h-9 w-9 items-center justify-center p-0 shadow-none"
                >
                  <MentrixaVocabIcon
                    name={step.vocabIcon}
                    size={18}
                    gold={step.vocabIcon === "verified"}
                    surface="light"
                    title={step.title}
                  />
                </LandingStickyNote>
                <p className={landingHub.stickyWord}>{step.title}</p>
              </div>
              <p className={cn(landingHub.body, "mt-3")}>{step.line}</p>
            </LandingStickyCard>
          ))}
        </div>
      </div>
    </section>
  );
}

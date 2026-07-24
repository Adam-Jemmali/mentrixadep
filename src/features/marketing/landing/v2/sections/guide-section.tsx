"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import {
  fadeUp,
  slideFromLeft,
  slideFromRight,
  staggerContainer,
  viewportOnce,
  cardHoverLift,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import {
  LandingSectionHeader,
  LandingStickyCard,
} from "@/features/marketing/landing/ui/landing-section-shell";
import { LandingNumberHeading, LandingNumberWatermark } from "@/features/marketing/landing/ui/landing-number-heading";
import { LP_NUM } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { useLandingNumericReveal } from "@/features/marketing/landing/ui/use-landing-numeric-reveal";
import { LandingRoleIcon } from "@/features/marketing/landing/ui/landing-role-icon";
import { LandingRoleText } from "@/features/marketing/landing/ui/landing-role-text";
import { LandingVocabWord } from "@/features/marketing/landing/ui/landing-vocab-word";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_GUIDE } from "@/features/marketing/landing/landing-copy-pure";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";

function StickyGrid({
  items,
  indexOffset,
}: {
  items: readonly { word: string; sentence: string }[];
  indexOffset: number;
}) {
  const { cinematic } = useLandingMotion();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {items.map((item, i) => {
        const num = String(i + 1);

        return (
          <motion.div
            key={item.word}
            variants={i % 2 === 0 ? slideFromLeft : slideFromRight}
            custom={Math.floor(i / 2)}
            whileHover={cinematic ? cardHoverLift : undefined}
          >
            <LandingStickyCard
              rotate={i % 2 === 0}
              variant={landingStickyVariantForIndex(i + indexOffset)}
              className={cn(
                LP_NUM.card,
                "relative h-full cursor-default overflow-hidden opacity-0",
                i % 2 === 1 && "rotate-[0.45deg]",
              )}
            >
              <LandingNumberWatermark value={num} />
              <div className="relative">
                <LandingVocabWord word={item.word} prefix={`${num}.`} size="xl" />
              </div>
              <p className={cn(landingHub.body, "relative mt-3")}>
                <span className="sr-only">Tool {num}. </span>
                <LandingRoleText text={item.sentence} iconSize="sm" />
              </p>
            </LandingStickyCard>
          </motion.div>
        );
      })}
    </div>
  );
}

export function GuideSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { cinematic } = useLandingMotion();
  useLandingNumericReveal(sectionRef);

  return (
    <section id="guide" ref={sectionRef} className={landingHub.sectionTight}>
      <div className={cn(landingHub.sectionInner, "max-w-5xl")}>
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}>
          <LandingSectionHeader
            eyebrow={LANDING_GUIDE.eyebrow}
            title={LANDING_GUIDE.title}
            subtitle={LANDING_GUIDE.subtitle}
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          custom={0}
          whileHover={cinematic ? cardHoverLift : undefined}
          className="mx-auto mt-10 max-w-2xl"
        >
          <LandingStickyCard rotate={false} variant="clip" className="text-center rotate-[0.25deg] px-5 py-6 sm:px-7">
            <p className="inline-flex items-center justify-center">
              <LandingVocabWord word={LANDING_GUIDE.definition.word} role="guide" size="xl" />
            </p>
            <p className={`mt-3 ${landingHub.body}`}>
              <LandingRoleText text={LANDING_GUIDE.definition.sentence} iconSize="sm" />
            </p>
            <p className={`mt-4 text-sm font-semibold text-[var(--mx-indigo)] ${landingHub.bodySm}`}>
              <LandingRoleText text={LANDING_GUIDE.notRank} iconSize="sm" />
            </p>
          </LandingStickyCard>
        </motion.div>

        <div className="mt-8">
          <LandingNumberHeading
            count={LANDING_GUIDE.features.length}
            suffix="tools"
            subtitle={LANDING_GUIDE.featuresSubtitle}
            className="mb-6"
          />
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}>
            <StickyGrid items={LANDING_GUIDE.features} indexOffset={1} />
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          custom={1}
          className="mx-auto mt-10 max-w-xl text-center"
        >
          <p className={`font-semibold ${landingHub.body}`}>
            <LandingRoleText text={LANDING_GUIDE.verdict} iconSize="md" />
          </p>
          <Link href={LANDING_GUIDE.href} className={cn("mt-6 inline-flex", landingHub.btnPrimary)}>
            <LandingRoleIcon role="guide" size="md" className="brightness-0 invert" />
            {LANDING_GUIDE.cta}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
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
  LandingSectionShell,
  LandingStickyCard,
} from "@/features/marketing/landing/ui/landing-section-shell";
import { GuideRankLadderPreview } from "@/features/marketing/landing/v2/sections/guide-rank-ladder-preview";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_GUIDE } from "@/features/marketing/landing/landing-copy-pure";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";

const ICON_VERSION = "20260718";

function GuideRoleIcon({ className = "" }: { className?: string }) {
  return (
    <span className={cn("relative inline-block size-5 shrink-0", className)} aria-hidden>
      <Image
        src={`/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        width={20}
        height={20}
        unoptimized
        className="size-full object-contain"
        sizes="20px"
      />
    </span>
  );
}

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
      {items.map((item, i) => (
        <motion.div
          key={item.word}
          variants={i % 2 === 0 ? slideFromLeft : slideFromRight}
          custom={Math.floor(i / 2)}
          whileHover={cinematic ? cardHoverLift : undefined}
        >
          <LandingStickyCard
            rotate={i % 2 === 0}
            variant={landingStickyVariantForIndex(i + indexOffset)}
            className={cn("h-full cursor-default", i % 2 === 1 && "rotate-[0.45deg]")}
          >
            <p className={landingHub.stickyWord}>{item.word}</p>
            <p className={`mt-2 ${landingHub.body}`}>{item.sentence}</p>
          </LandingStickyCard>
        </motion.div>
      ))}
    </div>
  );
}

export function GuideSection() {
  const { cinematic } = useLandingMotion();

  return (
    <LandingSectionShell id="guide" innerClassName="max-w-5xl">
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
          <p className={`inline-flex items-center justify-center gap-2 ${landingHub.stickyWord}`}>
            <GuideRoleIcon />
            {LANDING_GUIDE.definition.word}
          </p>
          <p className={`mt-3 ${landingHub.body}`}>{LANDING_GUIDE.definition.sentence}</p>
          <p className={`mt-4 text-sm font-semibold text-[#6366F1] ${landingHub.bodySm}`}>{LANDING_GUIDE.notRank}</p>
        </LandingStickyCard>
      </motion.div>

      <div className="mt-12 space-y-10">
        <div>
          <LandingSectionHeader
            title={LANDING_GUIDE.featuresTitle}
            subtitle={LANDING_GUIDE.featuresSubtitle}
            className="mb-8"
          />
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}>
            <StickyGrid items={LANDING_GUIDE.features} indexOffset={1} />
          </motion.div>
        </div>

        <div className="border-t border-[#C4B5FD]/60 pt-10">
          <LandingSectionHeader
            title={LANDING_GUIDE.accessTitle}
            subtitle={LANDING_GUIDE.accessSubtitle}
            className="mb-8"
          />
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}>
            <StickyGrid items={LANDING_GUIDE.access} indexOffset={6} />
          </motion.div>
        </div>
      </div>

      <GuideRankLadderPreview className="mx-auto max-w-3xl" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeUp}
        custom={1}
        className="mx-auto mt-10 max-w-xl text-center"
      >
        <p className={`font-semibold ${landingHub.body}`}>{LANDING_GUIDE.verdict}</p>
        <Link href={LANDING_GUIDE.href} className={cn("mt-6 inline-flex", landingHub.btnPrimary)}>
          <GuideRoleIcon className="brightness-0 invert" />
          {LANDING_GUIDE.cta}
        </Link>
      </motion.div>
    </LandingSectionShell>
  );
}

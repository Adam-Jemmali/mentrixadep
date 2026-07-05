"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { IMAGE_QUALITY } from "@/shared/core/image-defaults";
import {
  staggerContainer,
  viewportOnce,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_BREAKTHROUGH_ICON,
  CANONICAL_DUELS_ICON,
  CANONICAL_LEAGUE_ICON,
  CANONICAL_QUEST_ICON,
  CANONICAL_RANK_PROOF_ICON,
  CANONICAL_SESSION_ICON,
} from "@/shared/icons/vocab-canonical";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import {
  LandingSectionHeader,
  LandingSectionShell,
} from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_FEATURES } from "@/features/marketing/landing/landing-copy-pure";

type Feature = {
  title: string;
  image: string;
  vocabIcon: VocabIconName;
  rotation: number;
};

const FEATURE_ROWS: Feature[][] = [
  [
    { title: LANDING_FEATURES.polaroidTitles[0], image: "/images/features/live-duels.webp", vocabIcon: CANONICAL_DUELS_ICON, rotation: -2 },
    { title: LANDING_FEATURES.polaroidTitles[1], image: "/images/features/duel-arena.webp", vocabIcon: CANONICAL_LEAGUE_ICON, rotation: 2 },
  ],
  [
    { title: LANDING_FEATURES.polaroidTitles[2], image: "/images/features/problem-solver.webp", vocabIcon: CANONICAL_QUEST_ICON, rotation: 1 },
    { title: LANDING_FEATURES.polaroidTitles[3], image: "/images/features/learning-path.webp", vocabIcon: CANONICAL_RANK_PROOF_ICON, rotation: -1 },
  ],
  [
    { title: LANDING_FEATURES.polaroidTitles[4], image: "/images/features/league.webp", vocabIcon: "impact-score", rotation: -2 },
    { title: LANDING_FEATURES.polaroidTitles[5], image: "/images/features/clan-wars.webp", vocabIcon: CANONICAL_DUELS_ICON, rotation: 2 },
  ],
  [
    { title: LANDING_FEATURES.polaroidTitles[6], image: "/images/features/session-room.webp", vocabIcon: CANONICAL_SESSION_ICON, rotation: 1 },
    { title: LANDING_FEATURES.polaroidTitles[7], image: "/images/features/study-package.webp", vocabIcon: CANONICAL_QUEST_ICON, rotation: -1 },
  ],
  [
    { title: LANDING_FEATURES.polaroidTitles[8], image: "/images/features/studio-output.webp", vocabIcon: CANONICAL_SESSION_ICON, rotation: -2 },
    { title: LANDING_FEATURES.polaroidTitles[9], image: "/images/features/guide-knowledge.webp", vocabIcon: CANONICAL_BREAKTHROUGH_ICON, rotation: 2 },
  ],
];

function FeatureIconBadge({ name }: { name: VocabIconName }) {
  return (
    <div
      className={`${landingHub.stickyCard} flex size-11 shrink-0 rotate-0 items-center justify-center p-2 sm:size-12`}
      aria-hidden
    >
      <MentrixaVocabIcon name={name} size={28} surface="light" title={name} />
    </div>
  );
}

function PolaroidPhoto({ feature }: { feature: Feature }) {
  return (
    <div className="relative">
      <div
        className="lp-polaroid relative overflow-hidden rounded-sm bg-white p-2 pb-9 shadow-[2px_4px_0_rgba(11,18,32,0.18)] sm:p-2 sm:pb-10"
        style={{ transform: `rotate(${feature.rotation}deg)` }}
      >
        <div className="relative h-[140px] w-[200px] overflow-hidden rounded-[2px] sm:h-[160px] sm:w-[240px]">
          <Image
            src={feature.image}
            alt={feature.title}
            fill
            loading="lazy"
            className="object-cover object-top"
            sizes="(max-width: 640px) 200px, 240px"
            quality={IMAGE_QUALITY}
          />
        </div>
        <p className="absolute inset-x-0 bottom-2 px-2 text-center text-[11px] font-semibold tracking-tight text-[#334155] sm:text-xs">
          {feature.title}
        </p>
        <div className="pointer-events-none absolute -right-2 -top-1.5 h-6 w-10 rotate-12 bg-[#EDE9FE]/90 shadow-sm" />
      </div>
    </div>
  );
}

function PolaroidCard({ feature, align }: { feature: Feature; align: "left" | "right" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: feature.rotation * 0.4 }}
      whileInView={{ opacity: 1, y: 0, rotate: feature.rotation }}
      viewport={{ once: true, margin: "-8%" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "lp-polaroid-card group flex flex-col items-center",
        align === "left" ? "sm:items-start sm:pr-4" : "sm:items-end sm:pl-4",
      )}
    >
      <div className="relative flex items-center gap-2.5 sm:gap-3">
        {align === "left" ? (
          <>
            <PolaroidPhoto feature={feature} />
            <FeatureIconBadge name={feature.vocabIcon} />
          </>
        ) : (
          <>
            <FeatureIconBadge name={feature.vocabIcon} />
            <PolaroidPhoto feature={feature} />
          </>
        )}
      </div>
    </motion.div>
  );
}

export function FeaturesBentoSection() {
  return (
    <LandingSectionShell id="features" innerClassName="max-w-5xl">
      <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}>
        <LandingSectionHeader
          eyebrow={LANDING_FEATURES.eyebrow}
          title={LANDING_FEATURES.title}
          subtitle={LANDING_FEATURES.subtitle}
        />
      </motion.div>

      <div className={`${landingHub.notebookCard} relative mt-10 space-y-8 sm:space-y-10`}>
        <div className="pointer-events-none absolute bottom-4 left-1/2 top-4 hidden w-px -translate-x-1/2 bg-[#C4B5FD]/60 sm:block" />

        {FEATURE_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6366F1] bg-[#EDE9FE] sm:block" />
            <PolaroidCard feature={row[0]!} align="left" />
            <PolaroidCard feature={row[1]!} align="right" />
          </div>
        ))}
      </div>
    </LandingSectionShell>
  );
}

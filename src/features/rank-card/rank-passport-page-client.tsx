"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { motion } from "@/shared/animation/motion";
import { useHydrationSafeMotion } from "@/shared/animation/use-hydration-safe-motion";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { MasteryGrid } from "@/components/mastery-grid";
import { buildApReadinessBand } from "@/features/student-home/ap-readiness-band-pure";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { RankCardData } from "@/features/rank-card/types";
import { RankPassport3D, RankPassportSlide } from "@/features/rank-card/rank-passport-3d";
import {
  RankPassportIdentityPage,
} from "@/features/rank-card/rank-passport-identity-page";
import {
  RankPassportSkillProofPage,
  RankPassportVerifiedSpread,
} from "@/features/rank-card/rank-passport-page-content";
import {
  formatBreakthroughReceiptLine,
  rankPassportBandCaption,
  rankPassportPeerValue,
} from "@/features/rank-card/rank-passport-page-pure";
import { RankPassportTopBar } from "@/features/rank-card/rank-passport-article";
import { buildMasteryGridNextAction } from "@/features/mastery-grid/mastery-grid-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  MentrixaVocabIcon,
  VocabSectionHeading,
  VOCAB_HEADING_ICON_SIZE,
} from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_MASTERY_GRID_ICON,
  CANONICAL_QUEST_ICON,
} from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";
import { getSiteUrl } from "@/shared/core/site";

function LiveRecordBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6366F1]/35 bg-[#EDE9FE] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#4F46E5]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      Live
    </span>
  );
}

export function RankPassportPageClient({
  data,
  isOwner = false,
}: {
  data: RankCardData;
  isOwner?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { prefersReducedMotion, safeReduceMotion } = useHydrationSafeMotion();
  const accuracyPercent = data.verifiedAccuracyPercent;
  const topPercent = data.passportVerdict.kind === "ranked" ? data.passportVerdict.topPercent : null;

  const readinessBand = useMemo(
    () =>
      buildApReadinessBand({
        verifiedCount: data.verifiedSkillCount,
        accuracyPercent,
        percentile: data.verifiedPercentile,
        eligibleCohortSize: null,
      }),
    [accuracyPercent, data.verifiedPercentile, data.verifiedSkillCount],
  );

  const bandCaption = rankPassportBandCaption(readinessBand.score);
  const gridNextAction = data.masteryGrid ? buildMasteryGridNextAction(data.masteryGrid.units) : null;
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const pageCount =
    4 + (data.masteryGrid ? 1 : 0) + (data.breakthroughReceipts.length > 0 ? 1 : 0);

  useGsapEffect(
    (gsap) => {
      if (prefersReducedMotion || !rootRef.current) return;
      const ctx = gsap.context(() => {
        gsap.from(".rank-passport-mount", {
          y: 16,
          opacity: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: "power2.out",
        });
      }, rootRef);
      return () => ctx.revert();
    },
    [prefersReducedMotion],
  );

  let slideIndex = 0;

  return (
    <div
      ref={rootRef}
      className={cn(mentrixStudent.pageBg, "mentrix-student-type-scope relative min-h-dvh text-[#0B1220]")}
    >
      <header className="rank-passport-mount sticky top-0 z-20 border-b border-[#C4B5FD]/80 bg-[#F8F7FF]/92 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link href="/" className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6366F1]">
            Mentrixa
          </Link>
          <LiveRecordBadge />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-3 pb-16 pt-4 sm:px-4">
        <div className="rank-passport-mount">
          <RankPassportTopBar />
        </div>

        <div className="rank-passport-mount mt-3">
          <RankPassport3D subjectLabel={AP_CALC_AB_SUBJECT} pageCount={pageCount}>
            <RankPassportSlide slideIndex={slideIndex++}>
              <RankPassportVerifiedSpread
                data={data}
                accuracyPercent={accuracyPercent}
                topPercent={topPercent}
                bandCaption={bandCaption}
              />
            </RankPassportSlide>

            <RankPassportSlide slideIndex={slideIndex++}>
              <RankPassportIdentityPage data={data} />
            </RankPassportSlide>

            <RankPassportSlide slideIndex={slideIndex++}>
              <RankPassportSkillProofPage
                data={data}
                accuracyPercent={accuracyPercent}
                topPercent={topPercent}
                bandCaption={bandCaption}
              />
            </RankPassportSlide>

            {data.masteryGrid ? (
              <RankPassportSlide slideIndex={slideIndex++} interactive>
                <div className="rank-passport-page-fill flex h-full min-h-0 flex-col">
                  <VocabSectionHeading name={CANONICAL_MASTERY_GRID_ICON} label="Grid" surface="light" />
                  <MasteryGrid
                    userId={data.userId}
                    subject={AP_CALC_AB_SUBJECT}
                    mode="public"
                    compact
                    passportPage
                    attemptedOnly
                    passportScroll
                    surface="light"
                    initialData={data.masteryGrid}
                    showVerdict={false}
                    className="mt-2 min-h-0 flex-1"
                  />
                </div>
              </RankPassportSlide>
            ) : null}

            {data.breakthroughReceipts.length > 0 ? (
              <RankPassportSlide slideIndex={slideIndex++}>
                <VocabSectionHeading name="receipt" label="Breakthroughs" surface="light" />
                <ul className="mt-2 space-y-1.5">
                  {data.breakthroughReceipts.map((receipt) => (
                    <li
                      key={`${receipt.nodeName}-${receipt.date}-${receipt.beforeState}`}
                      className="flex items-start gap-2 py-1 text-[11px] text-[#0B1220]"
                    >
                      <MentrixaVocabIcon name="receipt" size={16} surface="light" title="" />
                      <span>{formatBreakthroughReceiptLine(receipt)}</span>
                    </li>
                  ))}
                </ul>
              </RankPassportSlide>
            ) : null}

            <RankPassportSlide slideIndex={slideIndex++}>
              <VocabSectionHeading name="rank-proof" label="Record" surface="light" />
              <p className="mt-2 font-mono text-xs text-[#6366F1]">
                {siteHost}/rank/{data.username}
              </p>
              <p className="mt-2 text-[10px] text-[#475569]">{data.vfaStreakDays ?? 0} day streak</p>
              {isOwner && gridNextAction ? (
                <motion.div className="mt-3" whileTap={safeReduceMotion ? undefined : { scale: 0.98 }}>
                  <Link
                    href="/student/quest"
                    className={cn(
                      mentrixStudent.hubBtnSolid,
                      "inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold",
                    )}
                  >
                    <MentrixaVocabIcon
                      name={CANONICAL_QUEST_ICON}
                      size={VOCAB_HEADING_ICON_SIZE * 0.36}
                      surface="light"
                      title=""
                    />
                    Verify next
                  </Link>
                </motion.div>
              ) : null}
            </RankPassportSlide>
          </RankPassport3D>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
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
  RankPassportBreakthroughPage,
  RankPassportRecordPage,
  RankPassportSkillProofPage,
  RankPassportVerifiedSpread,
} from "@/features/rank-card/rank-passport-page-content";
import {
  rankPassportBandCaption,
} from "@/features/rank-card/rank-passport-page-pure";
import { RankPassportTopBar } from "@/features/rank-card/rank-passport-article";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  VocabSectionHeading,
} from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_MASTERY_GRID_ICON,
} from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";
import { getSiteUrl } from "@/shared/core/site";

function LiveRecordBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mx-indigo)]/35 bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#4F46E5]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      Live
    </span>
  );
}

export function RankPassportPageClient({
  data,
}: {
  data: RankCardData;
  isOwner?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { prefersReducedMotion } = useHydrationSafeMotion();
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
      className={cn(mentrixStudent.pageBg, "mentrix-student-type-scope relative min-h-dvh text-[var(--mx-navy)]")}
    >
      <header className="rank-passport-mount sticky top-0 z-20 border-b border-violet-300/80 bg-[#F8F7FF]/92 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link href="/" className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--mx-indigo)]">
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
                <RankPassportBreakthroughPage receipts={data.breakthroughReceipts} />
              </RankPassportSlide>
            ) : null}

            <RankPassportSlide slideIndex={slideIndex++}>
              <RankPassportRecordPage
                username={data.username}
                siteHost={siteHost}
                vfaStreakLongest={data.vfaStreakLongest ?? 0}
                vfaStreakDays={data.vfaStreakDays ?? 0}
              />
            </RankPassportSlide>
          </RankPassport3D>
        </div>
      </main>
    </div>
  );
}

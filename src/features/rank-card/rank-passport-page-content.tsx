"use client";

import { StudentHubAnimatedFraction } from "@/features/student-home/student-hub-animated-fraction";
import {
  StudentHubNumericReveal,
  StudentHubNumericStat,
  StudentHubPlayfairNumbers,
} from "@/features/student-home/student-hub-numeric-panel";
import { LandingNumberWatermark } from "@/features/marketing/landing/ui/landing-number-heading";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { landingStickyVariantForIndex } from "@/features/student-profile/student-sticky-variants";
import type { RankCardData, RankPassportReceipt } from "@/features/rank-card/types";
import {
  breakthroughReceiptDisplayValue,
  breakthroughReceiptLift,
  passportFirstTryWatermark,
  rankPassportBandCaption,
  rankPassportBreakthroughVerdict,
  rankPassportPeerValue,
  rankPassportRecordVerdict,
  resolvePassportVerifiedMetrics,
  summarizePassportBreakthroughs,
} from "@/features/rank-card/rank-passport-page-pure";
import { formatXpWatermarkK } from "@/shared/core/copy-format";
import {
  CANONICAL_LEAGUE_ICON,
  CANONICAL_RANK_PROOF_ICON,
} from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

export function RankPassportVerifiedSpread({
  data,
  accuracyPercent,
  topPercent,
  bandCaption,
  className,
}: {
  data: RankCardData;
  accuracyPercent: number;
  topPercent: number | null;
  bandCaption: string;
  className?: string;
}) {
  const accuracy = resolvePassportVerifiedMetrics(data);
  const peerLine =
    topPercent != null
      ? `Top ${topPercent}% on first try`
      : rankPassportPeerValue(data.passportVerdict, data.verifiedPercentile);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="font-[family-name:var(--font-playfair),serif] text-[clamp(2rem,5vw,2.5rem)] font-bold leading-tight text-[#0B1220]">
        {data.displayName}
      </p>
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[#6366F1]">First-try accuracy</p>
      <StudentHubAnimatedFraction
        compact
        numerator={accuracy.correct}
        denominator={data.verifiedSkillCount}
        percent={data.verifiedAccuracyPercent}
        unitLabel="skills"
      />
      <p className="text-sm font-semibold leading-snug text-[#475569]">{bandCaption}</p>
      <p className="text-xs font-medium text-[#0B1220]">{peerLine}</p>
      <p className="text-xs uppercase tracking-[0.12em] text-[#64748B]">First attempt only</p>
    </div>
  );
}

export function RankPassportSkillProofPage({
  data,
  accuracyPercent,
  topPercent,
  bandCaption,
  className,
}: {
  data: RankCardData;
  accuracyPercent: number;
  topPercent: number | null;
  bandCaption: string;
  className?: string;
}) {
  const division = data.passportDivision;
  const divisionRankDisplay =
    division.status === "no_division" || division.myRank == null ? "—" : `#${division.myRank}`;
  const accuracyMetrics = resolvePassportVerifiedMetrics(data);

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6366F1]">Skill proof</p>
      <p className="text-base font-semibold leading-snug text-[#0B1220]">{bandCaption}</p>
      <StudentHubNumericReveal immediate className="grid grid-cols-2 gap-3">
        <StudentHubNumericStat
          className="col-span-2 rotate-[0.2deg] px-3 py-3.5"
          variant={landingStickyVariantForIndex(0)}
          compact
          watermark={passportFirstTryWatermark(data)}
          icon={CANONICAL_RANK_PROOF_ICON}
          label="First try"
          numericEnd={accuracyMetrics.correct}
          numericSuffix={`/${data.verifiedSkillCount}`}
          gold={data.verifiedAccuracyPercent >= 70}
        />
        <StudentHubNumericStat
          className="rotate-[-0.15deg] px-3 py-3.5"
          variant={landingStickyVariantForIndex(1)}
          compact
          watermark={division.myRank ?? "—"}
          icon={CANONICAL_LEAGUE_ICON}
          label="Division rank"
          numericEnd={division.myRank ?? 0}
          displayValue={divisionRankDisplay}
          detail={division.divisionName}
          gold={division.status === "rank_1"}
        />
        <StudentHubNumericStat
          className="rotate-[0.15deg] px-3 py-3.5"
          variant={landingStickyVariantForIndex(2)}
          compact
          watermark={formatXpWatermarkK(division.myXp)}
          icon="xp"
          label="Division XP"
          numericEnd={division.myXp}
          valueFormat="xp-k"
        />
      </StudentHubNumericReveal>
      <p className="text-xs font-medium text-[#475569]">
        {rankPassportPeerValue(data.passportVerdict, data.verifiedPercentile)}
        {topPercent != null ? ` · Top ${topPercent}%` : ""}
      </p>
    </div>
  );
}

export function rankPassportBriefBandCaption(score: number): string {
  return rankPassportBandCaption(score);
}

export function RankPassportBreakthroughPage({
  receipts,
  className,
}: {
  receipts: RankPassportReceipt[];
  className?: string;
}) {
  const summary = summarizePassportBreakthroughs(receipts);
  const verdict = rankPassportBreakthroughVerdict(summary);
  const bestLiftDisplay = summary.bestLift != null ? `+${summary.bestLift}%` : "—";

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6366F1]">Breakthroughs</p>
      <StudentHubNumericReveal immediate className="grid grid-cols-2 gap-3">
        <StudentHubNumericStat
          className="col-span-2 rotate-[0.15deg] px-3 py-3.5"
          variant={landingStickyVariantForIndex(0)}
          compact
          watermark={summary.bestLift != null ? `+${summary.bestLift}` : summary.count}
          icon="receipt"
          label="Best lift"
          numericEnd={summary.bestLift ?? summary.count}
          numericSuffix={summary.bestLift != null ? "%" : ""}
          displayValue={summary.bestLift != null ? bestLiftDisplay : undefined}
          detail={summary.bestLiftNodeName ?? undefined}
        />
        <StudentHubNumericStat
          className="rotate-[-0.12deg] px-3 py-3.5"
          variant={landingStickyVariantForIndex(1)}
          compact
          watermark={summary.count}
          icon="receipt"
          label="Breakthrough count"
          numericEnd={summary.count}
        />
        <StudentHubNumericStat
          className="rotate-[0.1deg] px-3 py-3.5"
          variant={landingStickyVariantForIndex(2)}
          compact
          watermark={summary.avgLift != null ? `+${summary.avgLift}` : "—"}
          icon="rank-proof"
          label="Average lift"
          numericEnd={summary.avgLift ?? 0}
          numericSuffix={summary.avgLift != null ? "%" : ""}
          displayValue={summary.avgLift == null ? "—" : `+${summary.avgLift}%`}
        />
      </StudentHubNumericReveal>
      <ul className="grid grid-cols-2 gap-3">
        {receipts.map((receipt, index) => {
          const lift = breakthroughReceiptLift(receipt);
          return (
            <li key={`${receipt.nodeName}-${receipt.date}-${receipt.beforeState}`}>
              <LandingStickyNote
                variant={landingStickyVariantForIndex(index % 3)}
                compact
                className="relative px-3 py-3 text-center"
              >
                <LandingNumberWatermark value={lift != null ? `+${lift}` : receipt.nodeName.slice(0, 3)} />
                <p className="font-[family-name:var(--font-playfair),serif] text-[clamp(1.2rem,2.8vw,1.65rem)] font-bold leading-tight text-[#0B1220]">
                  {breakthroughReceiptDisplayValue(receipt)}
                </p>
                <p className="mt-1 truncate text-xs font-black uppercase tracking-[0.12em] text-[#6366F1]">
                  {receipt.nodeName}
                </p>
                <p className="mt-0.5 text-xs text-[#64748B]">{receipt.date}</p>
              </LandingStickyNote>
            </li>
          );
        })}
      </ul>
      <p className="text-xs font-medium leading-snug text-[#475569]">
        <StudentHubPlayfairNumbers text={verdict} />
      </p>
    </div>
  );
}

export function RankPassportRecordPage({
  username,
  siteHost,
  vfaStreakLongest = 0,
  vfaStreakDays = 0,
  className,
}: {
  username: string;
  siteHost: string;
  vfaStreakLongest?: number;
  vfaStreakDays?: number;
  className?: string;
}) {
  const verdict = rankPassportRecordVerdict(vfaStreakLongest, vfaStreakDays);

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6366F1]">Live record</p>
      <StudentHubNumericReveal immediate className="grid grid-cols-1 gap-3">
        <StudentHubNumericStat
          className="rotate-[0.1deg] px-3 py-3.5"
          variant={landingStickyVariantForIndex(0)}
          compact
          watermark={vfaStreakLongest}
          icon="rank-proof"
          label="Best streak"
          numericEnd={vfaStreakLongest}
          numericSuffix=" day"
          displayValue={`${vfaStreakLongest} day best streak`}
        />
        {vfaStreakDays > 0 ? (
          <StudentHubNumericStat
            className="rotate-[-0.08deg] px-3 py-3.5"
            variant={landingStickyVariantForIndex(1)}
            compact
            watermark={vfaStreakDays}
            icon="rank-proof"
            label="Current streak"
            numericEnd={vfaStreakDays}
            numericSuffix=" day"
            displayValue={`${vfaStreakDays} day proof streak`}
          />
        ) : null}
      </StudentHubNumericReveal>
      <p className="font-mono text-base text-[#6366F1]">
        {siteHost}/rank/{username}
      </p>
      <p className="text-xs font-medium leading-snug text-[#475569]">
        <StudentHubPlayfairNumbers text={verdict} />
      </p>
    </div>
  );
}

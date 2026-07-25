"use client";

import { StudentHubAnimatedFraction } from "@/features/student-home/student-hub-animated-fraction";
import {
  StudentHubNumericReveal,
  StudentHubNumericStat,
  StudentHubPlayfairNumbers,
} from "@/features/student-home/student-hub-numeric-panel";
import { landingStickyVariantForIndex } from "@/features/student-profile/student-sticky-variants";
import type { RankCardData, RankPassportReceipt } from "@/features/rank-card/types";
import {
  breakthroughReceiptDisplayValue,
  breakthroughReceiptLift,
  formatBreakthroughReceiptLine,
  passportFirstTryWatermark,
  pickBestPassportBreakthroughReceipt,
  rankPassportBandCaption,
  rankPassportBreakthroughConciseVerdict,
  rankPassportPeerValue,
  rankPassportRecordVerdict,
  resolvePassportVerifiedMetrics,
} from "@/features/rank-card/rank-passport-page-pure";
import { formatXpWatermarkK } from "@/shared/core/copy-format";
import {
  CANONICAL_BREAKTHROUGH_ICON,
  CANONICAL_LEAGUE_ICON,
  CANONICAL_RANK_PROOF_ICON,
} from "@/shared/icons/vocab-canonical";
import { VocabSectionHeading, MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

export function RankPassportVerifiedSpread({
  data,
  accuracyPercent: _accuracyPercent,
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
      <VocabSectionHeading
        name={CANONICAL_RANK_PROOF_ICON}
        label="First-try accuracy"
        surface="light"
        iconSize={28}
        className="gap-2.5"
        labelClassName="font-[family-name:var(--font-playfair),serif] text-[clamp(1.35rem,3.2vw,1.65rem)] font-bold normal-case tracking-normal text-[var(--mx-indigo)]"
      />
      <StudentHubAnimatedFraction
        compact
        className="rank-passport-verified-fraction"
        numerator={accuracy.correct}
        denominator={data.verifiedSkillCount}
        percent={data.verifiedAccuracyPercent}
        unitLabel="skills"
      />
      <p className="text-base font-semibold leading-snug text-[#475569]">{bandCaption}</p>
      <p className="text-sm font-medium text-[var(--mx-navy)]">{peerLine}</p>
      <p className="text-sm uppercase tracking-[0.12em] text-[#64748B]">First attempt only</p>
    </div>
  );
}

export function RankPassportSkillProofPage({
  data,
  accuracyPercent: _accuracyPercent,
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
      <p className="text-base font-semibold leading-snug text-[var(--mx-navy)]">{bandCaption}</p>
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
  const best = pickBestPassportBreakthroughReceipt(receipts);
  const others = receipts.filter((receipt) => receipt !== best).slice(0, 2);
  const bestLift = best ? breakthroughReceiptLift(best) : null;
  const verdict = rankPassportBreakthroughConciseVerdict(best, receipts.length);

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      {best ? (
        <StudentHubNumericReveal immediate>
          <StudentHubNumericStat
            className="rotate-[0.12deg] px-3 py-3.5"
            variant={landingStickyVariantForIndex(0)}
            compact
            watermark={bestLift != null ? `+${bestLift}` : best.nodeName.slice(0, 3)}
            icon={CANONICAL_BREAKTHROUGH_ICON}
            label={best.nodeName}
            numericEnd={bestLift ?? 0}
            displayValue={breakthroughReceiptDisplayValue(best)}
            detail={bestLift != null ? `+${bestLift}% · ${best.date}` : best.date}
            gold={bestLift != null && bestLift >= 20}
          />
        </StudentHubNumericReveal>
      ) : null}
      {others.length > 0 ? (
        <ul className="space-y-2">
          {others.map((receipt) => (
            <li
              key={`${receipt.nodeName}-${receipt.date}-${receipt.beforeState}`}
              className="flex items-start gap-2 text-sm leading-snug text-[#475569]"
            >
              <MentrixaVocabIcon
                name={CANONICAL_BREAKTHROUGH_ICON}
                size={20}
                surface="light"
                title=""
                className="mt-0.5 shrink-0"
              />
              <span>{formatBreakthroughReceiptLine(receipt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
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
      <StudentHubNumericReveal immediate className="grid grid-cols-1 gap-3">
        <StudentHubNumericStat
          className="rotate-[0.1deg] px-3 py-3.5"
          variant={landingStickyVariantForIndex(0)}
          compact
          watermark={vfaStreakLongest}
          icon="streak"
          label="Best streak"
          numericEnd={vfaStreakLongest}
          numericSuffix=" days"
        />
        {vfaStreakDays > 0 ? (
          <StudentHubNumericStat
            className="rotate-[-0.08deg] px-3 py-3.5"
            variant={landingStickyVariantForIndex(1)}
            compact
            watermark={vfaStreakDays}
            icon="streak"
            label="Current streak"
            numericEnd={vfaStreakDays}
            numericSuffix=" days"
          />
        ) : null}
      </StudentHubNumericReveal>
      <div className="flex items-center gap-2">
        <VocabSectionHeading name="passport" surface="light" iconSize={22} className="shrink-0 gap-0" as="span" />
        <p className="font-mono text-base text-[var(--mx-indigo)]">
          {siteHost}/rank/{username}
        </p>
      </div>
      <p className="text-xs font-medium leading-snug text-[#475569]">
        <StudentHubPlayfairNumbers text={verdict} />
      </p>
    </div>
  );
}

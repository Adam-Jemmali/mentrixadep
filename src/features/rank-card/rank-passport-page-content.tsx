"use client";

import { StudentHubAnimatedFraction } from "@/features/student-home/student-hub-animated-fraction";
import {
  StudentHubNumericReveal,
  StudentHubNumericStat,
} from "@/features/student-home/student-hub-numeric-panel";
import { landingStickyVariantForIndex } from "@/features/student-profile/student-sticky-variants";
import type { RankCardData } from "@/features/rank-card/types";
import {
  rankPassportBandCaption,
  rankPassportPeerValue,
  resolvePassportVerifiedMetrics,
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
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="font-[family-name:var(--font-playfair),serif] text-[clamp(1.65rem,4vw,2rem)] font-bold leading-tight text-[#0B1220]">
        {data.displayName}
      </p>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6366F1]">First-try accuracy</p>
      <StudentHubAnimatedFraction
        compact
        numerator={accuracy.correct}
        denominator={data.verifiedSkillCount}
        percent={accuracyPercent}
        unitLabel="skills"
      />
      <p className="text-[11px] font-semibold leading-snug text-[#475569]">{bandCaption}</p>
      <p className="text-[10px] font-medium text-[#0B1220]">{peerLine}</p>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#64748B]">First attempt only</p>
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
    <div className={cn("flex flex-col gap-2.5", className)}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6366F1]">Skill proof</p>
      <p className="text-[12px] font-semibold leading-snug text-[#0B1220]">{bandCaption}</p>
      <StudentHubNumericReveal immediate className="grid grid-cols-2 gap-2">
        <StudentHubNumericStat
          className="rotate-0 px-2 py-2.5"
          variant={landingStickyVariantForIndex(0)}
          compact
          watermark={data.verifiedSkillCount}
          icon={CANONICAL_RANK_PROOF_ICON}
          label="Verified nodes"
          numericEnd={data.verifiedSkillCount}
          gold={data.verifiedSkillCount >= 50}
        />
        <StudentHubNumericStat
          className="rotate-[0.2deg] px-2 py-2.5"
          variant={landingStickyVariantForIndex(1)}
          compact
          watermark={accuracyPercent}
          icon={CANONICAL_RANK_PROOF_ICON}
          label="First try"
          numericEnd={accuracyMetrics.correct}
          displayValue={accuracyMetrics.value}
          gold={accuracyPercent >= 70}
        />
        <StudentHubNumericStat
          className="rotate-[-0.15deg] px-2 py-2.5"
          variant={landingStickyVariantForIndex(2)}
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
          className="rotate-[0.15deg] px-2 py-2.5"
          variant={landingStickyVariantForIndex(3)}
          compact
          watermark={formatXpWatermarkK(division.myXp)}
          icon="xp"
          label="Division XP"
          numericEnd={division.myXp}
          valueFormat="xp-k"
        />
      </StudentHubNumericReveal>
      <p className="text-[10px] font-medium text-[#475569]">
        {rankPassportPeerValue(data.passportVerdict, data.verifiedPercentile)}
        {topPercent != null ? ` · Top ${topPercent}%` : ""}
      </p>
    </div>
  );
}

export function rankPassportBriefBandCaption(score: number): string {
  return rankPassportBandCaption(score);
}

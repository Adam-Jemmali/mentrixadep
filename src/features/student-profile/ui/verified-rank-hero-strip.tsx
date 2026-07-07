"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import type { VerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import {
  MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE,
} from "@/features/xp/calibrated-rank";
import {
  peerBeatCount,
  peerTopPercent,
  peerStandingLockedLabel,
} from "@/features/xp/rank-statistics-pure";
import { XpTierProgressBar } from "@/shared/ui/progress-bar-patterns";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_QUEST_ICON } from "@/shared/icons/vocab-canonical";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

function HeroMetric({
  icon,
  label,
  value,
  suffix,
  barValue,
  barColor,
}: {
  icon: "verified" | "rank-proof" | "skills";
  label: string;
  value: string | number;
  suffix?: string;
  barValue: number;
  barColor: string;
}) {
  return (
    <div className="min-w-[7rem] flex-1 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1">
          <MentrixaVocabIcon name={icon} size={14} gold={icon === "verified"} surface="light" title={label} />
          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#6366F1]">{label}</span>
        </span>
        <span className="font-mono text-xs font-black tabular-nums text-[#0B1220]">
          {value}
          {suffix}
        </span>
      </div>
      <XpTierProgressBar
        value={barValue}
        tone="light"
        label={label}
        showHeader={false}
        fillStyle={{ background: barColor }}
      />
    </div>
  );
}

export function VerifiedRankHeroStrip({
  stats,
  nextActionHref = "/student/quest",
  nextActionLabel,
  className,
}: {
  stats: VerifiedFirstAttemptRankStats;
  nextActionHref?: string;
  nextActionLabel?: string;
  className?: string;
}) {
  if (stats.verifiedCount <= 0) return null;

  const peerStandingUnlocked =
    stats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE && stats.percentile != null;

  const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - stats.verifiedCount;
  const unlockProgress = Math.min(
    100,
    Math.round((stats.verifiedCount / MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE) * 100),
  );

  const cta =
    nextActionLabel ??
    (peerStandingUnlocked
      ? "Verify next node"
      : remaining > 0
        ? `Verify ${remaining} more`
        : "Verify first node");

  const topPercent = stats.percentile != null ? peerTopPercent(stats.percentile) : null;
  const beatCount = stats.percentile != null ? peerBeatCount(stats.percentile) : null;

  return (
    <div className={cn("max-w-2xl space-y-2", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <HeroMetric
          icon="verified"
          label="Accuracy"
          value={stats.accuracyPercent}
          suffix="%"
          barValue={stats.accuracyPercent}
          barColor="#7C3AED"
        />
        {peerStandingUnlocked && topPercent != null && beatCount != null ? (
          <HeroMetric
            icon="rank-proof"
            label="Top %"
            value={topPercent}
            suffix="%"
            barValue={beatCount}
            barColor="#6366F1"
          />
        ) : (
          <HeroMetric
            icon="skills"
            label="Peer standing"
            value={`${stats.verifiedCount}/${MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE}`}
            barValue={unlockProgress}
            barColor="#0891B2"
          />
        )}
      </div>

      {!peerStandingUnlocked ? (
        <p className="text-[10px] font-semibold text-[#475569]">
          {peerStandingLockedLabel(MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE)}
        </p>
      ) : beatCount != null ? (
        <p className="text-[10px] font-semibold text-[#475569]">
          Top {topPercent}% · beat {beatCount}/100.
        </p>
      ) : null}

      <Link
        href={nextActionHref}
        className={cn(mentrixStudent.hubGhostLink, "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]")}
      >
        <MentrixaVocabIcon name={CANONICAL_QUEST_ICON} size={14} surface="light" title="Quest" />
        {cta}
      </Link>
    </div>
  );
}

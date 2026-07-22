"use client";

import Link from "next/link";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { RANK_LADDER_CHIP_SIZE } from "@/features/xp/rank-display-tokens";
import type { VfaStreakHomeDisplay } from "@/features/vfa-streak/vfa-streak-pure";
import { VfaStreakBadge } from "@/components/vfa-streak-badge";
import {
  StudentHubNumericReveal,
  StudentHubNumericStat,
} from "@/features/student-home/student-hub-numeric-panel";
import { formatXpWatermarkK } from "@/shared/core/copy-format";
import { cn } from "@/shared/core/utils";

/** Rank badge + XP + verified proof streak on student home. */
export function StudentHomeRankStreakStrip({
  totalXp,
  vfaStreak,
  className,
}: {
  totalXp: number;
  vfaStreak: VfaStreakHomeDisplay;
  className?: string;
}) {
  const accountRank = getAccountRankFromTotalXp(totalXp);
  const streakDays = vfaStreak.kind === "active" ? vfaStreak.days : 0;

  return (
    <StudentHubNumericReveal
      className={cn("flex flex-wrap items-stretch gap-3", className)}
      animateValues
    >
      <Link
        href="/student/progress"
        className="inline-flex items-center gap-2.5 rounded-xl border border-[#E0E7FF] bg-white/90 px-3 py-2 shadow-[2px_4px_0_rgba(11,18,32,0.1)] transition hover:opacity-90"
        title={normalizeRankTitle(accountRank.title)}
      >
        <RankBadge
          rank={accountRank}
          size={RANK_LADDER_CHIP_SIZE}
          active
          surface="light"
          animate={accountRank.key === "mentrixer" || accountRank.key === "apex"}
        />
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: accountRank.labelOnLight }}
        >
          {normalizeRankTitle(accountRank.title)}
        </span>
      </Link>

      <StudentHubNumericStat
        className="min-w-[7.5rem] flex-1 rotate-0 px-2 py-2 sm:max-w-[9rem]"
        variant="curl"
        compact
        watermark={formatXpWatermarkK(totalXp)}
        icon="xp"
        label="Your XP"
        numericEnd={totalXp}
        valueFormat="xp-k"
        gold={accountRank.key === "mentrixer"}
      />

      {streakDays > 0 ? <VfaStreakBadge days={streakDays} /> : null}
    </StudentHubNumericReveal>
  );
}

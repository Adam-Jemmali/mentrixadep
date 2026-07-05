"use client";

import type { LevelTier } from "@/features/xp/levels";
import {
  getAccountRankForLeaderboardRow,
  normalizeRankTitle,
} from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { RANK_LADDER_CHIP_SIZE } from "@/features/xp/rank-display-tokens";
import { cn } from "@/shared/core/utils";

export function divisionTierDisplayName(tier: LevelTier): string {
  if (tier === "bronze") return "Learner";
  if (tier === "silver") return "Scholar";
  if (tier === "gold") return "Expert";
  return "Master";
}

/** Tier column: account rank SVG + label (global rank title when total XP known). */
export function LeaderboardTierRank({
  totalXp,
  divisionTier,
  showDivisionTierLabel = false,
  className,
}: {
  totalXp?: number;
  divisionTier: LevelTier;
  /** When true, show division tier name (Scholar) instead of account rank title (Rival). */
  showDivisionTierLabel?: boolean;
  className?: string;
}) {
  const rank = getAccountRankForLeaderboardRow(totalXp, divisionTier);
  const label = showDivisionTierLabel
    ? divisionTierDisplayName(divisionTier)
    : normalizeRankTitle(rank.title);

  return (
    <div className={cn("inline-flex items-center justify-end gap-2", className)}>
      <RankBadge
        rank={{ level: rank.level, title: rank.title }}
        size={RANK_LADDER_CHIP_SIZE}
        active
        surface="light"
        animate={rank.key === "mentrixer" || rank.key === "apex"}
      />
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: rank.labelOnLight }}
      >
        {label}
      </span>
    </div>
  );
}

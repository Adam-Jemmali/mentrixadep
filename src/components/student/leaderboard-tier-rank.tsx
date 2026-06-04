"use client";

import type { LevelTier } from "@/lib/levels";
import {
  getAccountRankForLeaderboardRow,
  normalizeRankTitle,
} from "@/lib/rank-icons";
import { RankBadge } from "@/components/student/rank-badge";
import { cn } from "@/lib/utils";

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
        rank={rank}
        size="xs"
        active
        showGlow={rank.key === "mentrixer"}
        className="!h-9 !w-9 shrink-0"
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

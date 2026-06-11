"use client";

import { cn } from "@/shared/core/utils";
import {
  normalizeRankTitle,
  type AccountRankVisual,
} from "@/features/xp/rank-icons";
import {
  RankBadge as XpRankBadge,
  type RankBadgeSize,
} from "@/features/xp/components/rank-badge";

type LegacySizeKey = "xs" | "sm" | "md" | "lg" | "xl";

const LEGACY_SIZE: Record<LegacySizeKey, RankBadgeSize> = {
  xs: "sm",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
};

/**
 * Legacy wrapper — maps AccountRankVisual props to the canonical XP rank badge.
 * Prefer `@/features/xp/components/rank-badge` for new code.
 */
export function RankBadge({
  rank,
  size = "md",
  active = false,
  locked = false,
  showGlow = false,
  priority: _priority = false,
  className,
}: {
  rank: AccountRankVisual;
  size?: LegacySizeKey;
  active?: boolean;
  locked?: boolean;
  showGlow?: boolean;
  priority?: boolean;
  className?: string;
}) {
  return (
    <XpRankBadge
      rank={{ level: rank.level, title: rank.title }}
      size={LEGACY_SIZE[size]}
      animate={showGlow && active}
      className={cn(
        active && "opacity-100",
        !active && "opacity-90",
        locked && "opacity-40 grayscale",
        className,
      )}
    />
  );
}

export function RankTitle({
  rank,
  active = true,
  tone = "dark",
  className,
}: {
  rank: AccountRankVisual;
  active?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const activeColor = tone === "light" ? rank.labelOnLight : rank.labelOnDark;

  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-[0.14em]",
        !active && (tone === "light" ? "text-zinc-600" : "text-zinc-500"),
        className,
      )}
      style={active ? { color: activeColor } : undefined}
    >
      {normalizeRankTitle(rank.title)}
    </span>
  );
}

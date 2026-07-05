import type { RankBadgeSize } from "@/features/xp/components/rank-badge";

/** Pixel sizes — must match landing `RankLadderShowcase` (md rail, xl hero). */
export const RANK_BADGE_SIZE_PX: Record<RankBadgeSize, number> = {
  sm: 24,
  md: 40,
  lg: 64,
  xl: 96,
};

/** Landing rail chip size. */
export const RANK_LADDER_CHIP_SIZE: RankBadgeSize = "md";

/** Landing hero / account header featured rank. */
export const RANK_HERO_SIZE: RankBadgeSize = "xl";

/** Navbar, leaderboard rows, compact inline. */
export const RANK_COMPACT_SIZE: RankBadgeSize = "sm";

export const RANK_TITLE_CLASS =
  "text-[10px] font-bold uppercase tracking-[0.14em]";

export const RANK_TITLE_RAIL_CLASS =
  "text-[10px] font-bold uppercase tracking-wide";

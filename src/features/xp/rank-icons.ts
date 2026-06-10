/**
 * Account rank visuals (Wanderer → Mentrixer).
 * Badge SVGs live in /public/icons/*.svg (680×330 emblem + labels).
 */

import { getAccountLevelFromTotalXp, type AccountLevelInfo, type LevelTier } from "@/features/xp/levels";

export type AccountRankKey =
  | "wanderer"
  | "seeker"
  | "scholar"
  | "contender"
  | "rival"
  | "apex"
  | "mentrixer";

export interface AccountRankVisual {
  level: number;
  key: AccountRankKey;
  title: string;
  iconSrc: string;
  /** Primary accent for borders, glow, text */
  color: string;
  /** Softer tint for backgrounds */
  colorMuted: string;
  /** Label on dark backgrounds */
  labelOnDark: string;
  /** Label on light backgrounds (WCAG AA 4.5:1 on white) */
  labelOnLight: string;
  minXp: number;
  maxXp: number | null;
}

export const ACCOUNT_RANK_VISUALS: readonly AccountRankVisual[] = [
  {
    level: 1,
    key: "wanderer",
    title: "Wanderer",
    iconSrc: "/icons/wanderer.svg",
    color: "#64748B",
    colorMuted: "rgba(100, 116, 139, 0.22)",
    labelOnDark: "#CBD5E1",
    labelOnLight: "#475569",
    minXp: 0,
    maxXp: 100,
  },
  {
    level: 2,
    key: "seeker",
    title: "Seeker",
    iconSrc: "/icons/seeker.svg",
    color: "#94A3B8",
    colorMuted: "rgba(148, 163, 184, 0.22)",
    labelOnDark: "#E2E8F0",
    labelOnLight: "#475569",
    minXp: 101,
    maxXp: 300,
  },
  {
    level: 3,
    key: "scholar",
    title: "Scholar",
    iconSrc: "/icons/scholar.svg",
    color: "#38BDF8",
    colorMuted: "rgba(56, 189, 248, 0.22)",
    labelOnDark: "#BAE6FD",
    labelOnLight: "#0369A1",
    minXp: 301,
    maxXp: 700,
  },
  {
    level: 4,
    key: "contender",
    title: "Contender",
    iconSrc: "/icons/contender.svg",
    color: "#2563EB",
    colorMuted: "rgba(37, 99, 235, 0.22)",
    labelOnDark: "#93C5FD",
    labelOnLight: "#1D4ED8",
    minXp: 701,
    maxXp: 1500,
  },
  {
    level: 5,
    key: "rival",
    title: "Rival",
    iconSrc: "/icons/rival.svg",
    color: "#4F46E5",
    colorMuted: "rgba(79, 70, 229, 0.24)",
    labelOnDark: "#A5B4FC",
    labelOnLight: "#4338CA",
    minXp: 1501,
    maxXp: 3000,
  },
  {
    level: 6,
    key: "apex",
    title: "Apex",
    iconSrc: "/icons/apex.svg",
    color: "#7C3AED",
    colorMuted: "rgba(124, 58, 237, 0.26)",
    labelOnDark: "#C4B5FD",
    labelOnLight: "#6D28D9",
    minXp: 3001,
    maxXp: 6000,
  },
  {
    level: 7,
    key: "mentrixer",
    title: "Mentrixer",
    iconSrc: "/icons/mentrixer-rank.svg",
    color: "#D4A017",
    colorMuted: "rgba(212, 160, 23, 0.28)",
    labelOnDark: "#F5D76E",
    labelOnLight: "#92400E",
    minXp: 6001,
    maxXp: null,
  },
] as const;

/** Square crop centered on emblem (matches all rank SVG root viewBox). */
export const RANK_SVG_VIEWBOX = "210 25 260 260";

export function normalizeRankTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

export function getAccountRankByLevel(level: number): AccountRankVisual {
  const row =
    ACCOUNT_RANK_VISUALS.find((r) => r.level === level) ??
    ACCOUNT_RANK_VISUALS[0]!;
  return row;
}

/** Division tier (bronze–platinum) → closest account rank emblem for leaderboards. */
export function getAccountRankVisualForDivisionTier(tier: LevelTier): AccountRankVisual {
  const levelByTier: Record<LevelTier, number> = {
    bronze: 1,
    silver: 3,
    gold: 6,
    platinum: 7,
  };
  return getAccountRankByLevel(levelByTier[tier] ?? 1);
}

export function getAccountRankForLeaderboardRow(
  totalXp: number | undefined,
  divisionTier: LevelTier,
): AccountRankVisual {
  if (typeof totalXp === "number" && totalXp >= 0) {
    return getAccountRankFromTotalXp(totalXp);
  }
  return getAccountRankVisualForDivisionTier(divisionTier);
}

export function getAccountRankFromTotalXp(totalXp: number): AccountRankVisual & {
  levelInfo: AccountLevelInfo;
} {
  const levelInfo = getAccountLevelFromTotalXp(totalXp);
  const rank = getAccountRankByLevel(levelInfo.level);
  return { ...rank, levelInfo };
}


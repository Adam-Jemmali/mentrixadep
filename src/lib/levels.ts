/**
 * Account levels (global total_xp) and division tiers (per-division XP).
 * No "use server" / "use client" — safe to import anywhere.
 */

// ─── Account levels (total XP) ─────────────────────────────────────────────

export const ACCOUNT_LEVELS = [
  { level: 1, title: "Rookie", minXp: 0, maxXp: 100 },
  { level: 2, title: "Learner", minXp: 101, maxXp: 300 },
  { level: 3, title: "Scholar", minXp: 301, maxXp: 700 },
  { level: 4, title: "Expert", minXp: 701, maxXp: 1500 },
  { level: 5, title: "Master", minXp: 1501, maxXp: 3000 },
  { level: 6, title: "Legend", minXp: 3001, maxXp: 6000 },
  { level: 7, title: "Champion", minXp: 6001, maxXp: 12000 },
  { level: 8, title: "Grandmaster", minXp: 12001, maxXp: null },
] as const;

export interface AccountLevelInfo {
  level: number;
  title: string;
  minXp: number;
  maxXp: number | null;
  /** XP progress within this level */
  xpIntoLevel: number;
  /** Total XP needed to reach the next account level (null if max) */
  nextLevelAt: number | null;
  /** XP remaining until next level */
  xpToNextLevel: number | null;
}

type AccountLevelRow = (typeof ACCOUNT_LEVELS)[number];

export function getAccountLevelFromTotalXp(totalXp: number): AccountLevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let row: AccountLevelRow = ACCOUNT_LEVELS[0]!;
  for (let i = ACCOUNT_LEVELS.length - 1; i >= 0; i--) {
    const r = ACCOUNT_LEVELS[i];
    if (r && xp >= r.minXp) {
      row = r;
      break;
    }
  }
  const maxXp = row.maxXp;
  const nextLevelAt =
    maxXp != null ? maxXp + 1 : null;
  const xpIntoLevel = xp - row.minXp;
  const xpToNextLevel =
    maxXp != null ? Math.max(0, maxXp + 1 - xp) : null;
  return {
    level: row.level,
    title: row.title,
    minXp: row.minXp,
    maxXp,
    xpIntoLevel,
    nextLevelAt,
    xpToNextLevel,
  };
}

/** True when an XP gain crosses into a higher account level (same rule as `applyXpAward`). */
export function levelUpDetected(oldTotalXp: number, newTotalXp: number): boolean {
  return getAccountLevelFromTotalXp(newTotalXp).level > getAccountLevelFromTotalXp(oldTotalXp).level;
}

// ─── Division tiers (per-division XP — Mentrixa “Divisions”) ─────────────────

export const DIVISION_TIERS = [
  { key: "bronze", label: "Bronze", minXp: 0, nextTierAt: 100 as number | null },
  { key: "silver", label: "Silver", minXp: 100, nextTierAt: 300 as number | null },
  { key: "gold", label: "Gold", minXp: 300, nextTierAt: 700 as number | null },
  { key: "platinum", label: "Platinum", minXp: 700, nextTierAt: null as number | null },
] as const;

/** @deprecated Use DIVISION_TIERS */
export const LEVEL_TIERS = DIVISION_TIERS;

export type LevelTier = (typeof DIVISION_TIERS)[number]["key"];

export interface LevelInfo {
  tier: LevelTier;
  label: string;
  minXp: number;
  nextTierAt: number | null;
  xpInTier: number;
  xpToNextLevel: number | null;
}

/** Tier for a single division’s XP total (not global account level). */
export function getDivisionTierFromXp(xp: number): LevelInfo {
  const clamped = Math.max(0, Math.floor(xp));
  for (let i = DIVISION_TIERS.length - 1; i >= 0; i--) {
    const row = DIVISION_TIERS[i];
    if (!row) continue;
    if (clamped >= row.minXp) {
      const nextTierAt = row.nextTierAt;
      return {
        tier: row.key,
        label: row.label,
        minXp: row.minXp,
        nextTierAt,
        xpInTier: clamped - row.minXp,
        xpToNextLevel: nextTierAt != null ? nextTierAt - clamped : null,
      };
    }
  }
  const row = DIVISION_TIERS[0]!;
  return {
    tier: row.key,
    label: row.label,
    minXp: row.minXp,
    nextTierAt: row.nextTierAt,
    xpInTier: clamped,
    xpToNextLevel: row.nextTierAt != null ? row.nextTierAt - clamped : null,
  };
}

/** Alias: division tier from XP (legacy name). */
export const getLevelFromXp = getDivisionTierFromXp;

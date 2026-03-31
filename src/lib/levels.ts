/**
 * Division level tiers and XP helpers — shared between client and server.
 * This file has no "use server" / "use client" directive so it can be
 * imported from both server components and client components.
 */

export const LEVEL_TIERS = [
  { key: "bronze",   label: "Bronze",   minXp: 0,   nextTierAt: 100  as number | null },
  { key: "silver",   label: "Silver",   minXp: 100, nextTierAt: 300  as number | null },
  { key: "gold",     label: "Gold",     minXp: 300, nextTierAt: 700  as number | null },
  { key: "platinum", label: "Platinum", minXp: 700, nextTierAt: null as number | null },
] as const;

export type LevelTier = (typeof LEVEL_TIERS)[number]["key"];

export interface LevelInfo {
  tier: LevelTier;
  label: string;
  minXp: number;
  nextTierAt: number | null;
  xpInTier: number;
  xpToNextLevel: number | null;
}

export function getLevelFromXp(xp: number): LevelInfo {
  const clamped = Math.max(0, Math.floor(xp));
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    const row = LEVEL_TIERS[i];
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
  // Fallback — should never reach here, but keeps TypeScript happy
  const row = LEVEL_TIERS[0]!;
  return {
    tier: row.key,
    label: row.label,
    minXp: row.minXp,
    nextTierAt: row.nextTierAt,
    xpInTier: clamped,
    xpToNextLevel: row.nextTierAt != null ? row.nextTierAt - clamped : null,
  };
}

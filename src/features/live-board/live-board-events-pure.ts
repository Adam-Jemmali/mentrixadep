import { rankLevelFromPercentile } from "@/features/xp/calibrated-rank";

export type LiveBoardEventType = "verified_attempt" | "rank_advance" | "breakthrough";

/** Single verified attempt score for the live board (0 or 100). */
export function verifiedAttemptAccuracyPct(isCorrect: boolean): number {
  return isCorrect ? 100 : 0;
}

/**
 * Public alias: user_settings.display_name when set;
 * otherwise first email letter plus random 4-digit suffix (never full email).
 */
export function resolveLiveBoardDisplayName(
  settingsDisplayName: string | null | undefined,
  email: string | null | undefined,
  randomSuffix?: number,
): string {
  const trimmed = typeof settingsDisplayName === "string" ? settingsDisplayName.trim() : "";
  if (trimmed) return trimmed.slice(0, 100);

  const first = (email?.trim()[0] ?? "M").toUpperCase();
  const suffix =
    randomSuffix ?? Math.floor(1000 + Math.random() * 9000);
  return `${first}${suffix}`;
}

export function detectVerifiedRankTierAdvance(
  priorPercentile: number | null | undefined,
  newPercentile: number | null | undefined,
): { advanced: boolean; newLevel: number } {
  const priorLevel = rankLevelFromPercentile(priorPercentile ?? 0);
  const newLevel = rankLevelFromPercentile(newPercentile ?? 0);
  return { advanced: newLevel > priorLevel, newLevel };
}

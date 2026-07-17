import type { LiveBoardEventType } from "@/features/live-board/types";

export type { LiveBoardEventType };

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

/** Division war headline for the Arena full-width card. */
export function formatDivisionWarResultHeadline(
  winnerName: string,
  loserName: string,
): string {
  const winner = winnerName.trim() || "Division";
  const loser = loserName.trim() || "Division";
  return `${winner} defeated ${loser}`;
}

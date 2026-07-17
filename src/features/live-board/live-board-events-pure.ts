import type { LiveBoardEventType } from "@/features/live-board/types";

export type { LiveBoardEventType };

/** Single verified attempt score for the live board (0 or 100). */
export function verifiedAttemptAccuracyPct(isCorrect: boolean): number {
  return isCorrect ? 100 : 0;
}

/**
 * Public Arena name from real profile fields only.
 * Order: display name → rank username → email local-part → "Mentrixer".
 * Never invents random digit aliases.
 */
export function resolveLiveBoardDisplayName(
  settingsDisplayName: string | null | undefined,
  email: string | null | undefined,
  username?: string | null,
): string {
  const trimmed =
    typeof settingsDisplayName === "string" ? settingsDisplayName.trim() : "";
  if (trimmed) return trimmed.slice(0, 100);

  const handle = typeof username === "string" ? username.trim() : "";
  if (handle) return handle.slice(0, 100);

  const prefix = (email?.split("@")[0] ?? "").trim();
  if (prefix) return prefix.slice(0, 100);

  return "Mentrixer";
}

/** True when a stored feed label looks like an old invented letter+digits alias. */
export function isInventedLiveBoardAlias(name: string): boolean {
  return /^[A-Za-z]\d{4}$/.test(name.trim());
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

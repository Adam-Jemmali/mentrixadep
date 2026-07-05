export const STREAK_RISK_MESSAGE = "Streak risk. Keep going today.";

export const STREAK_RISK_DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function streakRiskDismissedUntilKey(userId: string): string {
  return `mentrixa-streak-risk-dismissed-until:${userId}`;
}

export function isStreakRiskDismissed(userId: string, nowMs = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(streakRiskDismissedUntilKey(userId));
  const until = raw ? Number(raw) : NaN;
  return Number.isFinite(until) && nowMs < until;
}

export function dismissStreakRiskUntil(userId: string, nowMs = Date.now()): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    streakRiskDismissedUntilKey(userId),
    String(nowMs + STREAK_RISK_DISMISS_COOLDOWN_MS),
  );
}

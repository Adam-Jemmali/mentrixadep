import { getAccountLevelFromTotalXp, ACCOUNT_LEVELS } from "@/features/xp/levels";
import { normalizeRankTitle } from "@/features/xp/rank-icons";

export const PRE_SESSION_CONTEXT_TTL_MS = 6 * 60 * 60 * 1000;
export const PRE_SESSION_CONTEXT_WINDOW_MS = 30 * 60 * 1000;

/** Guide context panel unlocks 30 minutes before session start. */
export function isPreSessionContextWindowOpen(
  sessionStartTime: string,
  now = Date.now(),
): boolean {
  const start = new Date(sessionStartTime).getTime();
  if (!Number.isFinite(start)) return false;
  return now >= start - PRE_SESSION_CONTEXT_WINDOW_MS;
}

export function isGuideContextCacheFresh(cachedAt: string | null | undefined, now = Date.now()): boolean {
  if (!cachedAt) return false;
  const t = new Date(cachedAt).getTime();
  return Number.isFinite(t) && now - t < PRE_SESSION_CONTEXT_TTL_MS;
}

export function computeAccuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function subjectsLooselyMatch(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

export function buildBreakthroughMessage(params: {
  conceptLabel: string;
  currentRankTitle: string;
  totalXp: number;
}): { message: string; nextRankTitle: string } | null {
  const level = getAccountLevelFromTotalXp(params.totalXp);
  const next = ACCOUNT_LEVELS.find((r) => r.level === level.level + 1);
  if (!next) return null;

  const current = normalizeRankTitle(level.title);
  const nextTitle = normalizeRankTitle(next.title);
  const message = `If this student improves ${params.conceptLabel} by 20pts, they advance from ${current} to ${nextTitle}.`;

  return { message, nextRankTitle: nextTitle };
}

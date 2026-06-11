import { ACCOUNT_LEVELS, getAccountLevelFromTotalXp } from "@/features/xp/levels";

export type RankSummary = { level: number; title: string };

export function rankFromTotalXp(totalXp: number): RankSummary {
  const info = getAccountLevelFromTotalXp(totalXp);
  return { level: info.level, title: info.title };
}

export function rankChangeDirection(
  previous: RankSummary,
  current: RankSummary,
): "up" | "down" | "same" {
  if (current.level > previous.level) return "up";
  if (current.level < previous.level) return "down";
  return "same";
}

export function computeAccuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function computeAccuracyDelta(thisWeek: number, lastWeek: number): number {
  return thisWeek - lastWeek;
}

export function predictNextRank(params: {
  totalXp: number;
  xpEarnedLast7Days: number;
}): { title: string; xpNeeded: number; daysAtCurrentPace: number | null } {
  const levelInfo = getAccountLevelFromTotalXp(params.totalXp);
  const xpNeeded = levelInfo.xpToNextLevel ?? 0;
  const nextRow = ACCOUNT_LEVELS.find((r) => r.level === levelInfo.level + 1);
  const title = nextRow?.title ?? levelInfo.title;
  const dailyPace = params.xpEarnedLast7Days / 7;
  const daysAtCurrentPace =
    xpNeeded > 0 && dailyPace > 0 ? Math.max(1, Math.ceil(xpNeeded / dailyPace)) : null;
  return { title, xpNeeded, daysAtCurrentPace };
}

export function subjectLineRankPhrase(direction: "up" | "down" | "same"): string {
  if (direction === "up") return "your rank moved up this week";
  if (direction === "down") return "your rank moved down this week";
  return "your rank held steady this week";
}

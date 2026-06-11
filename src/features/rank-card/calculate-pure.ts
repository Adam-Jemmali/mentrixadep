import { getAccountLevelFromTotalXp } from "@/features/xp/levels";
import { normalizeRankTitle } from "@/features/xp/rank-icons";

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

export function rankFromTotalXp(totalXp: number): { title: string; level: number } {
  const info = getAccountLevelFromTotalXp(totalXp);
  return { title: normalizeRankTitle(info.title), level: info.level };
}

export function duelWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total <= 0) return 0;
  return Math.round((wins / total) * 100);
}

export function weekKeyFromDate(d: Date): string {
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().slice(0, 10);
}

export function buildRankCardShareTweet(params: {
  subject: string;
  rankTitle: string;
  accuracy: number;
  username: string;
  siteUrl: string;
}): string {
  const url = `${params.siteUrl}/rank/${params.username}`;
  return `My ${params.subject} rank on Mentrixa: ${params.rankTitle} | ${params.accuracy}% accuracy | Prove what you know → ${url}`;
}

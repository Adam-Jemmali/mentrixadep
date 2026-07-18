import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";

export const WRAPPED_MIN_ACTIVITY_DAYS = 30;

export type StudentWrappedData = {
  kind: "student";
  hardest_node: { nodeName: string; attempts: number } | null;
  breakthrough_node: { nodeName: string; deltaPoints: number } | null;
  best_month: { month: number; vfaCount: number } | null;
  rank_start: string;
  rank_end: string;
  guide_sessions_count: number;
  best_session_delta: { nodeName: string; deltaPoints: number } | null;
  vfa_streak_longest: number;
  total_nodes_verified: number;
};

export type GuideWrappedData = {
  kind: "guide";
  students_helped: number;
  total_breakthroughs: number;
  highest_impact_node: { nodeName: string; avgDelta: number } | null;
  total_earnings_cents: number;
};

export type WrappedReportData = StudentWrappedData | GuideWrappedData;

export function yearWindowUtc(reportYear: number): { startIso: string; endIso: string } {
  return {
    startIso: new Date(Date.UTC(reportYear, 0, 1, 0, 0, 0)).toISOString(),
    endIso: new Date(Date.UTC(reportYear, 11, 15, 23, 59, 59)).toISOString(),
  };
}

export function hasEnoughActivityDays(distinctActiveDays: number): boolean {
  return distinctActiveDays >= WRAPPED_MIN_ACTIVITY_DAYS;
}

export function rankTitleFromTotalXp(totalXp: number): string {
  return rankFromTotalXp(Math.max(0, totalXp)).title;
}

/** XP held on Jan 1 = current − awards on/after Jan 1 of report year. */
export function xpAtYearStart(params: {
  currentTotalXp: number;
  awardsOnOrAfterYearStart: number;
}): number {
  return Math.max(0, params.currentTotalXp - Math.max(0, params.awardsOnOrAfterYearStart));
}

export function pickHardestNode(
  rows: Array<{ nodeName: string; attempts: number; proficient: boolean }>,
): StudentWrappedData["hardest_node"] {
  const eligible = rows.filter((r) => r.proficient && r.attempts > 0);
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort((a, b) => {
    if (b.attempts !== a.attempts) return b.attempts - a.attempts;
    return a.nodeName.localeCompare(b.nodeName);
  });
  const top = sorted[0]!;
  return { nodeName: top.nodeName, attempts: top.attempts };
}

export function pickBreakthroughNode(
  rows: Array<{ nodeName: string; deltaPoints: number }>,
): StudentWrappedData["breakthrough_node"] {
  const positive = rows.filter((r) => r.deltaPoints > 0);
  if (positive.length === 0) return null;
  const sorted = [...positive].sort((a, b) => {
    if (b.deltaPoints !== a.deltaPoints) return b.deltaPoints - a.deltaPoints;
    return a.nodeName.localeCompare(b.nodeName);
  });
  const top = sorted[0]!;
  return { nodeName: top.nodeName, deltaPoints: Math.round(top.deltaPoints) };
}

export function pickBestMonth(
  vfaDatesIso: string[],
): StudentWrappedData["best_month"] {
  if (vfaDatesIso.length === 0) return null;
  const counts = new Map<number, number>();
  for (const iso of vfaDatesIso) {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) continue;
    const month = d.getUTCMonth() + 1;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  let best: { month: number; vfaCount: number } | null = null;
  for (const [month, vfaCount] of counts) {
    if (!best || vfaCount > best.vfaCount || (vfaCount === best.vfaCount && month < best.month)) {
      best = { month, vfaCount };
    }
  }
  return best;
}

export function pickBestSessionDelta(
  rows: Array<{ nodeName: string; deltaPoints: number }>,
): StudentWrappedData["best_session_delta"] {
  return pickBreakthroughNode(rows);
}

export function buildStudentWrappedData(input: {
  hardest: StudentWrappedData["hardest_node"];
  breakthrough: StudentWrappedData["breakthrough_node"];
  bestMonth: StudentWrappedData["best_month"];
  rankStartXp: number;
  rankEndXp: number;
  guideSessionsCount: number;
  bestSessionDelta: StudentWrappedData["best_session_delta"];
  vfaStreakLongest: number;
  totalNodesVerified: number;
}): StudentWrappedData {
  return {
    kind: "student",
    hardest_node: input.hardest,
    breakthrough_node: input.breakthrough,
    best_month: input.bestMonth,
    rank_start: rankTitleFromTotalXp(input.rankStartXp),
    rank_end: rankTitleFromTotalXp(input.rankEndXp),
    guide_sessions_count: Math.max(0, Math.round(input.guideSessionsCount)),
    best_session_delta: input.bestSessionDelta,
    vfa_streak_longest: Math.max(0, Math.round(input.vfaStreakLongest)),
    total_nodes_verified: Math.max(0, Math.round(input.totalNodesVerified)),
  };
}

export function buildGuideWrappedData(input: {
  studentsHelped: number;
  totalBreakthroughs: number;
  highestImpactNode: GuideWrappedData["highest_impact_node"];
  totalEarningsCents: number;
}): GuideWrappedData {
  return {
    kind: "guide",
    students_helped: Math.max(0, Math.round(input.studentsHelped)),
    total_breakthroughs: Math.max(0, Math.round(input.totalBreakthroughs)),
    highest_impact_node: input.highestImpactNode,
    total_earnings_cents: Math.max(0, Math.round(input.totalEarningsCents)),
  };
}

export function pickHighestImpactNode(
  rows: Array<{ nodeName: string; avgDelta: number }>,
): GuideWrappedData["highest_impact_node"] {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => {
    if (b.avgDelta !== a.avgDelta) return b.avgDelta - a.avgDelta;
    return a.nodeName.localeCompare(b.nodeName);
  });
  const top = sorted[0]!;
  return { nodeName: top.nodeName, avgDelta: Math.round(top.avgDelta) };
}

export function monthLabel(month: number): string {
  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return labels[Math.max(0, Math.min(11, month - 1))] ?? "Jan";
}

export type WrappedStatLine = {
  icon: string;
  label: string;
  value: string;
};

/** Brief display lines. Icon keys map to Mentrixa vocab names. */
export function studentWrappedStatLines(data: StudentWrappedData): WrappedStatLine[] {
  const lines: WrappedStatLine[] = [
    {
      icon: "passport",
      label: "Rank",
      value: `${data.rank_start} → ${data.rank_end}`,
    },
    {
      icon: "verified",
      label: "Verified",
      value: `${data.total_nodes_verified} nodes`,
    },
    {
      icon: "streak",
      label: "Longest streak",
      value: `${data.vfa_streak_longest} days`,
    },
    {
      icon: "session",
      label: "Guide sessions",
      value: String(data.guide_sessions_count),
    },
  ];

  if (data.hardest_node) {
    lines.push({
      icon: "focus-ring",
      label: "Hardest",
      value: `${data.hardest_node.nodeName} · ${data.hardest_node.attempts} attempts`,
    });
  }
  if (data.breakthrough_node) {
    lines.push({
      icon: "breakthrough",
      label: "Breakthrough",
      value: `${data.breakthrough_node.nodeName} · +${data.breakthrough_node.deltaPoints}`,
    });
  }
  if (data.best_month) {
    lines.push({
      icon: "day",
      label: "Best month",
      value: `${monthLabel(data.best_month.month)} · ${data.best_month.vfaCount} VFA`,
    });
  }
  if (data.best_session_delta) {
    lines.push({
      icon: "impact-score",
      label: "Best session",
      value: `${data.best_session_delta.nodeName} · +${data.best_session_delta.deltaPoints}`,
    });
  }

  return lines;
}

export function guideWrappedStatLines(data: GuideWrappedData): WrappedStatLine[] {
  const earnings = `$${(data.total_earnings_cents / 100).toFixed(0)}`;
  const lines: WrappedStatLine[] = [
    {
      icon: "session",
      label: "Students helped",
      value: String(data.students_helped),
    },
    {
      icon: "breakthrough",
      label: "Breakthroughs",
      value: String(data.total_breakthroughs),
    },
    {
      icon: "impact-score",
      label: "Earnings",
      value: earnings,
    },
  ];
  if (data.highest_impact_node) {
    lines.push({
      icon: "focus-ring",
      label: "Top impact",
      value: `${data.highest_impact_node.nodeName} · +${data.highest_impact_node.avgDelta}`,
    });
  }
  return lines;
}

export function wrappedHeadline(role: "student" | "tutor", year: number): string {
  return role === "tutor" ? `Guide Wrapped ${year}` : `Your Wrapped ${year}`;
}

export function wrappedSharePath(shareToken: string): string {
  return `/wrapped/${encodeURIComponent(shareToken)}`;
}

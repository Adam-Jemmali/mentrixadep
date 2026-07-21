import type { SkillNodeWeeklyDemandRow } from "@/features/demand-signal/demand-signal-pure";
import { subjectsLooselyMatch } from "@/features/pre-session-brief/context-pure";

export type GuideImpactNodeForForecast = {
  skillNodeId: string;
  impactLift: number;
  impactScore: number;
};

export type GuideEarningsForecastView = {
  demandMet: boolean;
  demandPrimary: string;
  demandSecondary: string | null;
  projectedDollars: number | null;
  paceLabel: string | null;
  ctaLabel: string;
  showCta: boolean;
};

export const EARNINGS_FORECAST_NET_FACTOR = 0.85;

export function pickStrongestImpactNodeId(
  nodes: GuideImpactNodeForForecast[],
): string | null {
  if (nodes.length === 0) return null;
  const sorted = [...nodes].sort((a, b) => {
    if (b.impactLift !== a.impactLift) return b.impactLift - a.impactLift;
    return b.impactScore - a.impactScore;
  });
  return sorted[0]!.skillNodeId;
}

export function countOpenSlotsForCourse(
  course: string,
  openSlots: Array<{ course: string }>,
): number {
  return openSlots.filter((slot) => subjectsLooselyMatch(slot.course, course)).length;
}

export function averageGuideRateCents(
  sessionRatesCents: number[],
  openSlots: Array<{ price_per_session?: number | null }>,
): number {
  const fromSessions = sessionRatesCents.filter((value) => value > 0);
  if (fromSessions.length > 0) {
    return Math.round(fromSessions.reduce((sum, value) => sum + value, 0) / fromSessions.length);
  }

  const fromSlots = openSlots
    .map((slot) => slot.price_per_session)
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (fromSlots.length > 0) {
    return Math.round(fromSlots.reduce((sum, value) => sum + value, 0) / fromSlots.length);
  }

  return 2500;
}

export function computeMonthlyProjectionDollars(params: {
  sessionsThisMonth: number;
  daysElapsedInMonth: number;
  guideRateCents: number;
}): number | null {
  const { sessionsThisMonth, daysElapsedInMonth, guideRateCents } = params;
  if (sessionsThisMonth <= 0) return null;

  const days = Math.max(1, daysElapsedInMonth);
  const paceSessions = (sessionsThisMonth / days) * 30;
  const dollars =
    paceSessions * (guideRateCents / 100) * EARNINGS_FORECAST_NET_FACTOR;

  return Math.round(dollars);
}

export function buildGuideEarningsForecast(params: {
  strongestImpactSkillNodeId: string | null;
  course: string | null;
  demandRows: SkillNodeWeeklyDemandRow[];
  openSlots: Array<{ course: string; price_per_session?: number | null }>;
  sessionsThisMonth: number;
  sessionRatesCents: number[];
  daysElapsedInMonth: number;
}): GuideEarningsForecastView | null {
  const {
    strongestImpactSkillNodeId,
    course,
    demandRows,
    openSlots,
    sessionsThisMonth,
    sessionRatesCents,
    daysElapsedInMonth,
  } = params;

  if (!strongestImpactSkillNodeId || !course) return null;

  const demandRow = demandRows.find((row) => row.skillNodeId === strongestImpactSkillNodeId);
  const studentsWeakCount = demandRow?.weakStudentCount ?? 0;
  const openCount = countOpenSlotsForCourse(course, openSlots);
  const demandMet = studentsWeakCount <= openCount;

  const demandPrimary = demandMet
    ? "Your availability is meeting current demand."
    : `Opening ${studentsWeakCount - openCount} more hours on ${course} could fill`;

  const demandSecondary = demandMet
    ? null
    : `based on ${studentsWeakCount} students in need.`;

  const guideRateCents = averageGuideRateCents(sessionRatesCents, openSlots);
  const projectedDollars = computeMonthlyProjectionDollars({
    sessionsThisMonth,
    daysElapsedInMonth,
    guideRateCents,
  });

  const paceLabel =
    projectedDollars != null
      ? `At your current pace: ~$${projectedDollars} this month`
      : null;

  return {
    demandMet,
    demandPrimary,
    demandSecondary,
    projectedDollars,
    paceLabel,
    ctaLabel: demandMet ? "Your schedule is full" : "Add more availability →",
    showCta: !demandMet,
  };
}

/** @deprecated Use buildGuideEarningsForecast */
export function buildEarningsForecastLine(params: {
  strongestImpactSkillNodeId: string | null;
  course: string | null;
  demandRows: SkillNodeWeeklyDemandRow[];
  openSlots: Array<{ course: string }>;
}): string | null {
  const view = buildGuideEarningsForecast({
    ...params,
    openSlots: params.openSlots,
    sessionsThisMonth: 0,
    sessionRatesCents: [],
    daysElapsedInMonth: 1,
  });
  if (!view) return null;
  if (view.demandSecondary) {
    return `${view.demandPrimary} ${view.demandSecondary}`;
  }
  return view.demandPrimary;
}

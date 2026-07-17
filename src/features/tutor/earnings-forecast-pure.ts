import type { SkillNodeWeeklyDemandRow } from "@/features/demand-signal/demand-signal-pure";
import { subjectsLooselyMatch } from "@/features/pre-session-brief/context-pure";

export type GuideImpactNodeForForecast = {
  skillNodeId: string;
  impactLift: number;
  impactScore: number;
};

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

export function buildEarningsForecastLine(params: {
  strongestImpactSkillNodeId: string | null;
  course: string | null;
  demandRows: SkillNodeWeeklyDemandRow[];
  openSlots: Array<{ course: string }>;
}): string | null {
  const { strongestImpactSkillNodeId, course, demandRows, openSlots } = params;
  if (!strongestImpactSkillNodeId || !course) return null;

  const demandRow = demandRows.find((row) => row.skillNodeId === strongestImpactSkillNodeId);
  const demand = demandRow?.weakStudentCount ?? 0;
  const openCount = countOpenSlotsForCourse(course, openSlots);

  if (demand <= openCount) {
    return "Your availability is meeting current demand";
  }

  const gap = demand - openCount;
  return `Opening ${gap} more hours on ${course} could fill based on current student demand`;
}

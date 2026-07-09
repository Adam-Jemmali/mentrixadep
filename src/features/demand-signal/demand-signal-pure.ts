import { subjectsLooselyMatch } from "@/features/pre-session-brief/context-pure";
import { utcStartOfWeekMonday } from "@/features/tutor/tutor-internal";

export type SkillNodeWeeklyDemandRow = {
  skillNodeId: string;
  subject: string;
  nodeName: string;
  weakStudentCount: number;
  weekStart: string;
};

export type GuideDemandSignal = {
  skillNodeId: string;
  nodeName: string;
  subject: string;
  weakStudentCount: number;
  rowLine: string;
  hasOpenAvailability: boolean;
};

export function formatUtcWeekStartMonday(d: Date): string {
  return utcStartOfWeekMonday(d).toISOString().slice(0, 10);
}

export function formatDemandRowLine(nodeName: string, weakStudentCount: number): string {
  return `${nodeName} is weak for ${weakStudentCount} student${weakStudentCount === 1 ? "" : "s"} this week`;
}

export function courseHasOpenAvailability(
  subject: string,
  openSlots: Array<{ course: string }>,
): boolean {
  return openSlots.some((slot) => subjectsLooselyMatch(slot.course, subject));
}

export function filterQualifiedDemandRows(
  rows: SkillNodeWeeklyDemandRow[],
  verifiedCourseNames: string[],
): SkillNodeWeeklyDemandRow[] {
  const qualified = verifiedCourseNames.filter(Boolean);
  if (qualified.length === 0) return [];

  return rows.filter((row) =>
    qualified.some((course) => subjectsLooselyMatch(course, row.subject)),
  );
}

export function buildGuideDemandSignals(params: {
  rows: SkillNodeWeeklyDemandRow[];
  verifiedCourseNames: string[];
  openAvailability: Array<{ course: string }>;
  limit?: number;
}): GuideDemandSignal[] {
  const qualifiedRows = filterQualifiedDemandRows(params.rows, params.verifiedCourseNames)
    .filter((row) => row.weakStudentCount > 0)
    .sort((a, b) => b.weakStudentCount - a.weakStudentCount);

  return qualifiedRows.slice(0, params.limit ?? 3).map((row) => ({
    skillNodeId: row.skillNodeId,
    nodeName: row.nodeName,
    subject: row.subject,
    weakStudentCount: row.weakStudentCount,
    rowLine: formatDemandRowLine(row.nodeName, row.weakStudentCount),
    hasOpenAvailability: courseHasOpenAvailability(row.subject, params.openAvailability),
  }));
}

export function buildDemandSignalVerdict(signals: GuideDemandSignal[]): string {
  if (signals.length === 0) {
    return "No demand signal yet.";
  }
  return `${signals[0]!.nodeName} needs you most this week.`;
}

export function buildDemandSignalNextAction(signals: GuideDemandSignal[]): string {
  if (signals.length === 0) {
    return "Verify AP CALCULUS AB proficiency first.";
  }
  const needsSlot = signals.find((signal) => !signal.hasOpenAvailability);
  if (needsSlot) {
    return `Open ${needsSlot.subject} slot.`;
  }
  return "Slots cover this week's demand.";
}

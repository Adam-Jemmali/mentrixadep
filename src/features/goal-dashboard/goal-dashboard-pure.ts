import type { StudentGoal } from "@/features/student-goals/types";
import { peerTopPercent } from "@/features/xp/rank-statistics-pure";

export function buildGoalDashboardVerdict(input: {
  goal: StudentGoal;
  verifiedNodeCount: number;
  targetPercentile: number | null;
  currentPercentile: number | null;
  daysUntilExam: number | null;
}): { verdict: string; nextAction: string } {
  const examLine =
    input.daysUntilExam != null && input.daysUntilExam >= 0
      ? `${input.daysUntilExam} days until your target date.`
      : "Your target date is set.";

  const paceLine =
    input.currentPercentile != null && input.targetPercentile != null
      ? `You are top ${peerTopPercent(input.currentPercentile)}% now; target is top ${peerTopPercent(input.targetPercentile)}%.`
      : `${input.verifiedNodeCount} verified nodes on the grid so far.`;

  return {
    verdict: `${examLine} ${paceLine}`,
    nextAction:
      input.verifiedNodeCount < 5
        ? "Verify 5 nodes to unlock peer standing, then retest your weakest node."
        : "Take one retest or duel this week to stay on pace for your goal.",
  };
}

export function daysUntilDate(isoDate: string | null, now = new Date()): number | null {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  if (!Number.isFinite(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

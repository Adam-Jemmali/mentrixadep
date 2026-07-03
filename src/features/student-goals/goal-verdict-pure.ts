import type { Verdict, VerdictNextAction } from "@/features/guidance/verdict-engine-pure";
import { practiceNodeHref } from "@/features/guidance/verdict-engine-pure";
import {
  EXAM_URGENCY_DAYS,
  type StudentGoal,
} from "@/features/student-goals/types";

export type GoalVerdictContext = {
  currentPercentile: number | null;
  verifiedNodesAbove70: number;
  totalSubjectNodes: number;
  highestImpactNode?: { skillNodeId: string; nodeName: string } | null;
};

export function daysUntilGoalDate(
  targetDateIso: string,
  nowMs = Date.now(),
): number {
  const targetMs = new Date(`${targetDateIso}T12:00:00.000Z`).getTime();
  if (!Number.isFinite(targetMs)) return Number.POSITIVE_INFINITY;
  return Math.ceil((targetMs - nowMs) / (24 * 60 * 60 * 1000));
}

export function isExamGoalUrgent(goal: StudentGoal, nowMs = Date.now()): boolean {
  if (goal.goalType !== "exam_date" || !goal.targetDate) return false;
  const days = daysUntilGoalDate(goal.targetDate, nowMs);
  return days >= 0 && days <= EXAM_URGENCY_DAYS;
}

export function estimateNodesNeededForPercentileTarget(
  currentPercentile: number | null,
  targetPercentile: number,
  verifiedNodesAbove70: number,
  totalSubjectNodes: number,
): number {
  if (totalSubjectNodes <= 0) return 0;
  if (currentPercentile !== null && currentPercentile >= targetPercentile) return 0;

  const targetNodesAbove70 = Math.ceil((targetPercentile / 100) * totalSubjectNodes);
  return Math.max(0, targetNodesAbove70 - verifiedNodesAbove70);
}

export function buildPercentileGapNextActionLabel(nodesNeeded: number): string {
  if (nodesNeeded <= 0) {
    return "On pace · verify next node";
  }
  const noun = nodesNeeded === 1 ? "node" : "nodes";
  return `Need ${nodesNeeded} more verified ${noun} above 70%`;
}

export function buildExamUrgentNextAction(nodeName: string, daysLeft: number): VerdictNextAction {
  const dayLabel = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
  return {
    label: `Exam in ${dayLabel}: verify ${nodeName} first`,
    href: practiceNodeHref(nodeName),
  };
}

export function applyGoalToVerdict(
  verdict: Verdict,
  goal: StudentGoal | null,
  ctx: GoalVerdictContext,
  nowMs = Date.now(),
): Verdict {
  if (!goal?.active) return verdict;

  if (goal.goalType === "exam_date" && isExamGoalUrgent(goal, nowMs)) {
    const impact = ctx.highestImpactNode;
    if (impact?.nodeName) {
      const daysLeft = daysUntilGoalDate(goal.targetDate!, nowMs);
      return {
        ...verdict,
        nextAction: buildExamUrgentNextAction(impact.nodeName, Math.max(0, daysLeft)),
      };
    }
  }

  if (goal.goalType === "percentile_target" && goal.targetPercentile != null) {
    const nodesNeeded = estimateNodesNeededForPercentileTarget(
      ctx.currentPercentile,
      goal.targetPercentile,
      ctx.verifiedNodesAbove70,
      ctx.totalSubjectNodes,
    );
    const gapLabel = buildPercentileGapNextActionLabel(nodesNeeded);
    const impact = ctx.highestImpactNode;
    return {
      ...verdict,
      nextAction: {
        label: gapLabel,
        href: impact?.nodeName
          ? practiceNodeHref(impact.nodeName)
          : verdict.nextAction.href,
      },
    };
  }

  if (goal.goalType === "pace_target") {
    const impact = ctx.highestImpactNode;
    if (impact?.nodeName) {
      return {
        ...verdict,
        nextAction: {
          label: `Keep climbing: verify ${impact.nodeName} next`,
          href: practiceNodeHref(impact.nodeName),
        },
      };
    }
  }

  return verdict;
}

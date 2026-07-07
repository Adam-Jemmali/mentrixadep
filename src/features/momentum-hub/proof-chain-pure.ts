import {
  buildTrajectoryIndex,
  type TrajectoryIndexInput,
  type TrajectoryIndexResult,
} from "@/features/trajectory-index/trajectory-index-pure";
import { formatLoopSourceLabel } from "@/features/loop-report/loop-report-funnel-pure";
import {
  buildRetestGuidedAction,
  type MomentumGuidedAction,
} from "@/features/momentum-hub/momentum-value-equation-pure";

export type ProofChainStepStatus = "complete" | "current" | "locked" | "stalled";

export type ProofChainStep = {
  id: string;
  label: string;
  detail: string;
  status: ProofChainStepStatus;
};

export type OpenLoopProofInput = {
  skillNodeId: string;
  nodeName: string;
  sourceType: string;
  scheduledFor: string;
  preAccuracy: number | null;
  isDue: boolean;
  priorityRetest: boolean;
  stallDays: number;
};

export type ClosedLoopProofInput = {
  nodeName: string;
  sourceType: string;
  preAccuracy: number;
  postAccuracy: number;
  delta: number;
  closureHours: number;
};

export type LoopVelocityIndex = {
  score: number;
  userMedianHours: number;
  cohortMedianHours: number | null;
  fasterThanCohortPercent: number | null;
  verdict: string;
  nextAction: string;
};

export type TrajectoryCounterfactual = {
  currentScore: number;
  projectedScore: number;
  lift: number;
  verdict: string;
  nextAction: string;
};

export type ProofChainPanelData =
  | {
      mode: "full";
      nodeName: string;
      steps: ProofChainStep[];
      counterfactual: TrajectoryCounterfactual | null;
      loopVelocity: LoopVelocityIndex | null;
      stallDays: number;
      verdict: string;
      nextAction: string;
      primaryAction: MomentumGuidedAction | null;
    }
  | {
      mode: "teaser";
      nodeName: string;
      stepCount: number;
      upsellLine: string;
    };

function formatAccuracy(ratio: number | null): string {
  if (ratio == null) return "—";
  return `${Math.round(ratio * 100)}%`;
}

export function buildOpenLoopProofSteps(input: OpenLoopProofInput): ProofChainStep[] {
  const pre = formatAccuracy(input.preAccuracy);
  const source = formatLoopSourceLabel(input.sourceType);

  const step1 =
    pre === "—"
      ? `${source} on ${input.nodeName}.`
      : `${source} left you at ${pre} on ${input.nodeName}.`;

  const step2 = input.isDue
    ? input.stallDays > 0
      ? `Overdue ${input.stallDays}d.`
      : "Window open."
    : input.priorityRetest
      ? "Priority window: 24h."
      : "Window: 48h.";

  const step3 = input.isDue ? "Retest open in Quest." : "Retest unlocks soon.";
  const step4 = "Rank updates after your first answer.";

  return [
    { id: "intervention", label: "", detail: step1, status: "complete" },
    {
      id: "wait",
      label: "",
      detail: step2,
      status: input.isDue ? "stalled" : "complete",
    },
    {
      id: "retest",
      label: "",
      detail: step3,
      status: input.isDue ? "current" : "locked",
    },
    { id: "movement", label: "", detail: step4, status: "locked" },
  ];
}

export function buildClosedLoopProofSteps(input: ClosedLoopProofInput): ProofChainStep[] {
  const pre = Math.round(input.preAccuracy * 100);
  const post = Math.round(input.postAccuracy * 100);
  const delta = post - pre;
  const sign = delta > 0 ? "+" : "";

  return [
    {
      id: "intervention",
      label: "",
      detail: `${formatLoopSourceLabel(input.sourceType)} on ${input.nodeName}.`,
      status: "complete",
    },
    {
      id: "wait",
      label: "",
      detail: `Closed in ${Math.round(input.closureHours)}h.`,
      status: "complete",
    },
    { id: "retest", label: "", detail: "First answer recorded.", status: "complete" },
    {
      id: "movement",
      label: "",
      detail: `${pre}% → ${post}% (${sign}${delta}). Permanent.`,
      status: delta > 0 ? "complete" : "stalled",
    },
  ];
}

export function projectTrajectoryLiftIfOverdueClosed(
  trajectory: TrajectoryIndexResult,
): TrajectoryCounterfactual | null {
  if (trajectory.retestsDuePast30d <= 0) return null;

  const input: TrajectoryIndexInput = {
    verifiedNodesGained30d: trajectory.verifiedNodesGained30d,
    retestsCompleted30d: trajectory.retestsCompleted30d + 1,
    retestsDuePast30d: Math.max(0, trajectory.retestsDuePast30d - 1),
    positiveLoops30d: trajectory.positiveLoops30d,
  };

  const projected = buildTrajectoryIndex(input);
  const lift = projected.score - trajectory.score;
  if (lift <= 0) {
    return {
      currentScore: trajectory.score,
      projectedScore: projected.score,
      lift: 0,
      verdict: "Closing this retest stops Trajectory decay.",
      nextAction: "Take the retest in Quest.",
    };
  }

  return {
    currentScore: trajectory.score,
    projectedScore: projected.score,
    lift,
    verdict: `Close this retest → Trajectory ${trajectory.score} → ${projected.score}.`,
    nextAction: "Take the retest in Quest.",
  };
}

export function buildLoopVelocityIndex(input: {
  userMedianClosureHours: number | null;
  cohortMedianClosureHours: number | null;
  closedLoops30d: number;
}): LoopVelocityIndex | null {
  if (input.closedLoops30d < 1 || input.userMedianClosureHours == null) return null;

  const userHours = input.userMedianClosureHours;
  const cohortHours = input.cohortMedianClosureHours;

  let score = 50;
  let fasterThanCohortPercent: number | null = null;

  if (cohortHours != null && cohortHours > 0) {
    const ratio = userHours / cohortHours;
    score = clampScore(Math.round(100 - (ratio - 1) * 40));
    fasterThanCohortPercent =
      userHours < cohortHours
        ? Math.round(((cohortHours - userHours) / cohortHours) * 100)
        : 0;
  } else {
    score = clampScore(Math.round(100 - userHours / 2));
  }

  const verdict =
    cohortHours != null && userHours < cohortHours
      ? `You close loops in ${Math.round(userHours)}h. Cohort median: ${Math.round(cohortHours)}h.`
      : cohortHours != null
        ? `Your median: ${Math.round(userHours)}h. Cohort: ${Math.round(cohortHours)}h.`
        : `Median closure: ${Math.round(userHours)}h (30d).`;

  const nextAction = score >= 70 ? "Keep closing within 48h." : "Close the next retest within 24h.";

  return {
    score,
    userMedianHours: userHours,
    cohortMedianHours: cohortHours,
    fasterThanCohortPercent,
    verdict,
    nextAction,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function computeMedianHours(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function stallDaysSince(scheduledFor: string, nowMs = Date.now()): number {
  const scheduledMs = new Date(scheduledFor).getTime();
  if (!Number.isFinite(scheduledMs) || scheduledMs > nowMs) return 0;
  return Math.floor((nowMs - scheduledMs) / (24 * 60 * 60 * 1000));
}

export function buildProofChainPanelData(input: {
  momentumActive: boolean;
  openLoop: OpenLoopProofInput | null;
  closedLoop: ClosedLoopProofInput | null;
  trajectory: TrajectoryIndexResult | null;
  loopVelocity: LoopVelocityIndex | null;
  closedLoops30d: number;
  totalLoops30d: number;
}): ProofChainPanelData | null {
  const focus = input.openLoop ?? null;
  const nodeName = focus?.nodeName ?? input.closedLoop?.nodeName ?? null;
  if (!nodeName) return null;

  if (!input.momentumActive) {
    return {
      mode: "teaser",
      nodeName,
      stepCount: 4,
      upsellLine: "Momentum shows session → retest → rank movement on every loop.",
    };
  }

  const steps = focus
    ? buildOpenLoopProofSteps(focus)
    : input.closedLoop
      ? buildClosedLoopProofSteps(input.closedLoop)
      : [];

  const counterfactual =
    focus?.isDue && input.trajectory
      ? projectTrajectoryLiftIfOverdueClosed(input.trajectory)
      : null;

  const stallDays = focus?.stallDays ?? 0;

  let verdict = focus
    ? focus.isDue
      ? `Retest overdue ${stallDays}d on ${nodeName}.`
      : `Loop open on ${nodeName}.`
    : input.closedLoop
      ? `${nodeName} closed. Movement verified.`
      : "Session → retest → rank movement.";

  let nextAction = focus?.isDue
    ? "Take the retest in Quest."
    : focus
      ? "Practice until the retest opens."
      : "Book a Guide to start a new loop.";

  if (counterfactual && counterfactual.lift > 0) {
    verdict = counterfactual.verdict;
    nextAction = counterfactual.nextAction;
  }

  const primaryAction = focus
    ? buildRetestGuidedAction({
        nodeName: focus.nodeName,
        skillNodeId: focus.skillNodeId,
        isDue: focus.isDue,
        counterfactual,
        closedLoops30d: input.closedLoops30d,
        totalLoops30d: input.totalLoops30d,
      })
    : null;

  return {
    mode: "full",
    nodeName,
    steps,
    counterfactual,
    loopVelocity: input.loopVelocity,
    stallDays,
    verdict,
    nextAction,
    primaryAction,
  };
}

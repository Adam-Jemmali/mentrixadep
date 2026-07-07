import type { MomentumGuidedAction } from "@/features/momentum-hub/momentum-value-equation-pure";
import type { PeerVelocitySnapshot } from "@/features/comparison/peer-velocity-pure";
import { buildPeerVelocityLine } from "@/features/comparison/peer-velocity-pure";
import type { TrajectoryIndexResult } from "@/features/trajectory-index/trajectory-index-pure";

export type GoalRunwayGoalInput = {
  verifiedNodeCount: number;
  daysUntilExam: number | null;
};

export type TrajectoryComponentKey = "verified" | "retest" | "loop";

export type TrajectoryBottleneck = {
  component: TrajectoryComponentKey;
  label: string;
  current: number;
  target: number;
  liftEstimate: number;
  fixAction: string;
};

export type TrajectoryHistoryPoint = {
  date: string;
  score: number;
};

export type GoalRunwaySummary = {
  nodesVerified: number;
  nodesNeeded: number;
  nodesPerWeekRequired: number;
  nodesPerWeekActual: number;
  onTrack: boolean;
  verdict: string;
  nextAction: string;
  progressPercent: number;
};

const COMPONENT_TARGETS = {
  verified: 100,
  retest: 100,
  loop: 100,
} as const;

const COMPONENT_LABELS: Record<TrajectoryComponentKey, string> = {
  verified: "Verified nodes",
  retest: "Retest closure",
  loop: "Loop delta",
};

export function identifyTrajectoryBottleneck(result: TrajectoryIndexResult): TrajectoryBottleneck {
  const components: { key: TrajectoryComponentKey; value: number }[] = [
    { key: "verified", value: result.verifiedComponent },
    { key: "retest", value: result.retestComponent },
    { key: "loop", value: result.loopComponent },
  ];
  const weakest = components.reduce((min, item) => (item.value < min.value ? item : min));

  const target = COMPONENT_TARGETS[weakest.key];
  const liftEstimate = Math.max(0, Math.round(target * 0.4 - weakest.value * 0.4));

  let fixAction = "Keep the beat: one closed loop this week with a priority retest.";
  if (weakest.key === "retest") {
    fixAction = "Close your overdue retest first to lift Retest closure.";
  } else if (weakest.key === "verified") {
    fixAction = "Verify two new nodes this week to lift Verified nodes.";
  } else if (weakest.key === "loop") {
    fixAction = "Close one coaching loop with positive movement this week.";
  }

  return {
    component: weakest.key,
    label: COMPONENT_LABELS[weakest.key],
    current: weakest.value,
    target,
    liftEstimate,
    fixAction,
  };
}

export function trajectoryWeekOverWeekDelta(
  currentScore: number,
  priorScore: number | null,
): string | null {
  if (priorScore == null) return null;
  const delta = currentScore - priorScore;
  if (delta > 0) return `+${delta} vs last week`;
  if (delta < 0) return `${delta} — movement stalled`;
  return "Flat vs last week";
}

export function trajectoryScoreBand(score: number): string {
  if (score >= 70) return "70–100 strong";
  if (score >= 40) return "40–69 building";
  return "0–39 stalled";
}

export function buildTrajectoryPeerLine(peer: PeerVelocitySnapshot | null): string | null {
  if (!peer) return null;
  return buildPeerVelocityLine(peer);
}

export function buildGoalRunwaySummary(input: {
  goal: GoalRunwayGoalInput | null;
  verifiedNodesGained30d: number;
  totalSkillNodes: number;
}): GoalRunwaySummary | null {
  if (!input.goal?.daysUntilExam || input.goal.daysUntilExam <= 0) return null;

  const nodesVerified = input.goal.verifiedNodeCount;
  const nodesNeeded = Math.max(0, input.totalSkillNodes - nodesVerified);
  const weeksLeft = Math.max(1, Math.ceil(input.goal.daysUntilExam / 7));
  const nodesPerWeekRequired = Math.ceil(nodesNeeded / weeksLeft);
  const nodesPerWeekActual = Math.round((input.verifiedNodesGained30d / 30) * 7 * 10) / 10;
  const onTrack = nodesPerWeekActual >= nodesPerWeekRequired || nodesNeeded === 0;
  const progressPercent =
    input.totalSkillNodes > 0
      ? Math.round((nodesVerified / input.totalSkillNodes) * 100)
      : 0;

  const verdict = onTrack
    ? `On track: ${nodesVerified} of ${input.totalSkillNodes} nodes verified with ${input.goal.daysUntilExam} days left.`
    : `Behind pace: need ${nodesPerWeekRequired} nodes/week; you averaged ${nodesPerWeekActual} over the last 30 days.`;

  const nextAction = onTrack
    ? "Hold pace with one verified node and one closed loop this week."
    : `Lift to ${nodesPerWeekRequired} verified nodes per week to hit your target date.`;

  return {
    nodesVerified,
    nodesNeeded,
    nodesPerWeekRequired,
    nodesPerWeekActual,
    onTrack,
    verdict,
    nextAction,
    progressPercent,
  };
}

export type TrajectoryPanelView =
  | {
      mode: "full";
      trajectory: TrajectoryIndexResult;
      bottleneck: TrajectoryBottleneck;
      weekOverWeek: string | null;
      peerLine: string | null;
      history: TrajectoryHistoryPoint[];
      goalRunway: GoalRunwaySummary | null;
      guidedAction: MomentumGuidedAction | null;
    }
  | {
      mode: "teaser";
      scoreBand: string;
      upsellLine: string;
    };

export function buildTrajectoryPanelView(input: {
  momentumActive: boolean;
  trajectory: TrajectoryIndexResult | null;
  priorWeekScore: number | null;
  peerLine: string | null;
  history: TrajectoryHistoryPoint[];
  goalRunway: GoalRunwaySummary | null;
  guidedAction?: MomentumGuidedAction | null;
}): TrajectoryPanelView | null {
  if (!input.trajectory) return null;

  if (!input.momentumActive) {
    return {
      mode: "teaser",
      scoreBand: trajectoryScoreBand(input.trajectory.score),
      upsellLine:
        "Subscribe to Momentum for your full Trajectory Index, 30-day trend, peer pace, and bottleneck drill-down.",
    };
  }

  return {
    mode: "full",
    trajectory: input.trajectory,
    bottleneck: identifyTrajectoryBottleneck(input.trajectory),
    weekOverWeek: trajectoryWeekOverWeekDelta(input.trajectory.score, input.priorWeekScore),
    peerLine: input.peerLine,
    history: input.history,
    goalRunway: input.goalRunway,
    guidedAction: input.guidedAction ?? null,
  };
}

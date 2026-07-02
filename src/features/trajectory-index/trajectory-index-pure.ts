export type TrajectoryIndexInput = {
  verifiedNodesGained30d: number;
  retestsCompleted30d: number;
  retestsDuePast30d: number;
  positiveLoops30d: number;
};

export type TrajectoryIndexResult = {
  score: number;
  verifiedComponent: number;
  retestComponent: number;
  loopComponent: number;
  verdict: string;
  nextAction: string;
};

const VERIFIED_TARGET = 10;
const LOOP_TARGET = 5;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildTrajectoryIndex(input: TrajectoryIndexInput): TrajectoryIndexResult {
  const verifiedComponent = clampScore((input.verifiedNodesGained30d / VERIFIED_TARGET) * 100);
  const retestDenom = input.retestsCompleted30d + input.retestsDuePast30d;
  const retestRate = retestDenom > 0 ? input.retestsCompleted30d / retestDenom : 0;
  const retestComponent = clampScore(retestRate * 100);
  const loopComponent = clampScore((input.positiveLoops30d / LOOP_TARGET) * 100);
  const score = clampScore(
    verifiedComponent * 0.4 + retestComponent * 0.3 + loopComponent * 0.3,
  );

  const verdict =
    score >= 70
      ? `Trajectory Index ${score}: strong verified movement and loop closure over the last 30 days.`
      : score >= 40
        ? `Trajectory Index ${score}: movement is happening, but retest and loop closure need attention.`
        : `Trajectory Index ${score}: verified movement stalled over the last 30 days compared to your Momentum pace.`;

  const nextAction =
    input.retestsDuePast30d > 0
      ? "Clear your overdue retest first, then book your included session on the weakest node."
      : input.verifiedNodesGained30d < 2
        ? "Verify two new nodes this week to lift your Trajectory Index."
        : "Keep the beat: one closed loop this week with a priority retest.";

  return {
    score,
    verifiedComponent,
    retestComponent,
    loopComponent,
    verdict,
    nextAction,
  };
}

/** Static subscribe-page social proof line derived from index bands. */
export function trajectoryIndexSocialProofLine(score: number): string {
  if (score >= 70) {
    return "Active Momentum subscribers with a strong Trajectory Index close coaching loops faster.";
  }
  if (score >= 40) {
    return "Momentum ties weekly receipts, priority retests, and included credits into one Trajectory Index.";
  }
  return "Momentum subscribers track verified movement with a Trajectory Index, not guesswork.";
}

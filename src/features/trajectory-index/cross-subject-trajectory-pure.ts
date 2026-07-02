export type SubjectTrajectoryScore = {
  subject: string;
  score: number;
};

export type UnifiedTrajectoryIndex = {
  score: number;
  subjectScores: SubjectTrajectoryScore[];
  verdict: string;
  nextAction: string;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Weighted mean across eligible subjects; single subject passes through unchanged. */
export function buildUnifiedTrajectoryIndex(
  subjectScores: SubjectTrajectoryScore[],
): UnifiedTrajectoryIndex | null {
  const scores = subjectScores.filter((row) => Number.isFinite(row.score) && row.score >= 0);
  if (scores.length === 0) return null;

  const total = scores.reduce((sum, row) => sum + row.score, 0);
  const score = clampScore(total / scores.length);

  const verdict =
    scores.length === 1
      ? `Unified Trajectory Index ${score} on ${scores[0]!.subject}.`
      : `Unified Trajectory Index ${score} across ${scores.length} subjects on your Momentum stack.`;

  const weakest = [...scores].sort((a, b) => a.score - b.score)[0];
  const nextAction = weakest
    ? `Lift ${weakest.subject} first: verify one new node and close one coaching loop this week.`
    : "Keep one verified node and one closed loop per subject this week.";

  return { score, subjectScores: scores, verdict, nextAction };
}

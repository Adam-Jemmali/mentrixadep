/** Pad partial duel answers with -1 (timeout) so scoring can run at forfeit time. */
export function padDuelAnswersForScoring(
  answers: number[] | null | undefined,
  questionCount: number,
): number[] {
  const base = Array.isArray(answers) ? [...answers] : [];
  while (base.length < questionCount) base.push(-1);
  return base.slice(0, questionCount);
}

/**
 * Supercell-style walkover: the player who leaves always loses.
 * Sparring Quest wins when the human leaves.
 */
export function forfeitWinnerSide(params: {
  isAiOpponent: boolean;
  forfeiterUserId: string;
  studentId: string;
  opponentStudentId: string | null;
}): "student" | "opponent" {
  if (params.isAiOpponent) return "opponent";
  if (params.forfeiterUserId === params.studentId) return "opponent";
  return "student";
}

export function duelForfeitResultCopy(params: {
  youLeft: boolean;
  opponentLeft: boolean;
  themLabel: string;
  youWon: boolean;
}): { headline: string; detail: string } {
  if (params.youLeft) {
    return {
      headline: "You left the match",
      detail: "Leaving counts as a loss. Your opponent keeps the win.",
    };
  }
  if (params.opponentLeft) {
    return {
      headline: params.youWon ? "Opponent left" : "Match ended",
      detail: `${params.themLabel} left the match. You win by walkover.`,
    };
  }
  return {
    headline: params.youWon ? "Victory" : "Match ended",
    detail: "This duel ended early.",
  };
}

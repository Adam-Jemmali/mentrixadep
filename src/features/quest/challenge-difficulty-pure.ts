/** Hidden adaptive difficulty — never surface rating numbers in student UI. */

export const DEFAULT_CHALLENGE_DIFFICULTY = 1000;
export const CHALLENGE_DIFFICULTY_BAND = 150;

export type ChallengeDifficultyState = {
  currentDifficultyRating: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
};

export function defaultChallengeDifficultyState(): ChallengeDifficultyState {
  return {
    currentDifficultyRating: DEFAULT_CHALLENGE_DIFFICULTY,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
  };
}

export function normalizeDifficultyRating(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CHALLENGE_DIFFICULTY;
  return Math.round(n * 100) / 100;
}

/**
 * Apply one free-response outcome to challenge difficulty state.
 * Rating only moves after two consecutive same-result answers.
 */
export function applyChallengeDifficultyOutcome(
  state: ChallengeDifficultyState,
  itemDifficultyRating: number,
  correct: boolean,
): ChallengeDifficultyState {
  const current = normalizeDifficultyRating(state.currentDifficultyRating);
  const item = normalizeDifficultyRating(itemDifficultyRating);

  if (correct) {
    const consecutiveCorrect = state.consecutiveCorrect + 1;
    let nextRating = current;
    if (consecutiveCorrect >= 2) {
      nextRating = normalizeDifficultyRating(current + (item - current) * 0.3);
    }
    return {
      currentDifficultyRating: nextRating,
      consecutiveCorrect,
      consecutiveIncorrect: 0,
    };
  }

  const consecutiveIncorrect = state.consecutiveIncorrect + 1;
  let nextRating = current;
  if (consecutiveIncorrect >= 2) {
    nextRating = normalizeDifficultyRating(current - (current - item) * 0.2);
  }
  return {
    currentDifficultyRating: nextRating,
    consecutiveCorrect: 0,
    consecutiveIncorrect,
  };
}

export function itemDifficultyDistance(
  itemDifficultyRating: number,
  studentRating: number,
): number {
  return Math.abs(
    normalizeDifficultyRating(itemDifficultyRating) - normalizeDifficultyRating(studentRating),
  );
}

export function isItemNearChallengeDifficulty(
  itemDifficultyRating: number,
  studentRating: number,
  band: number = CHALLENGE_DIFFICULTY_BAND,
): boolean {
  return itemDifficultyDistance(itemDifficultyRating, studentRating) < band;
}

/**
 * Prefer items within band of the student's hidden rating.
 * Falls back to the full pool when none match so packs never starve.
 */
export function preferItemsNearChallengeDifficulty<T extends { difficultyRating?: number | null }>(
  items: T[],
  studentRating: number | null | undefined,
  band: number = CHALLENGE_DIFFICULTY_BAND,
): T[] {
  if (studentRating == null || items.length === 0) return items;
  const near = items.filter((item) =>
    isItemNearChallengeDifficulty(
      item.difficultyRating ?? DEFAULT_CHALLENGE_DIFFICULTY,
      studentRating,
      band,
    ),
  );
  return near.length > 0 ? near : items;
}

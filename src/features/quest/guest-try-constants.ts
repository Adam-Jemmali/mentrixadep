/** Non–AP Calc guest try pack size (matches AP Calc try depth). */
export const GUEST_TRY_QUEST_COUNT = 10;

/** Minimum written problem-solving items in every curated pack. */
export const GUEST_TRY_MIN_PROBLEM_SOLVING = 3;

/** Timed pack limit scaled to question count (student default ≈ 15 min for ~10 items). */
export function guestTryTimeLimitSec(questionCount: number): number {
  const perQuestion = 90;
  return Math.min(60 * 60, Math.max(10 * 60, questionCount * perQuestion));
}

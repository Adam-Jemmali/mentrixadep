import { describe, expect, it } from "vitest";
import {
  applyChallengeDifficultyOutcome,
  DEFAULT_CHALLENGE_DIFFICULTY,
  defaultChallengeDifficultyState,
  isItemNearChallengeDifficulty,
  preferItemsNearChallengeDifficulty,
} from "@/features/quest/challenge-difficulty-pure";

describe("challenge-difficulty-pure", () => {
  it("does not move rating until two consecutive corrects", () => {
    const first = applyChallengeDifficultyOutcome(
      defaultChallengeDifficultyState(),
      1300,
      true,
    );
    expect(first.consecutiveCorrect).toBe(1);
    expect(first.currentDifficultyRating).toBe(DEFAULT_CHALLENGE_DIFFICULTY);

    const second = applyChallengeDifficultyOutcome(first, 1300, true);
    expect(second.consecutiveCorrect).toBe(2);
    expect(second.currentDifficultyRating).toBe(
      DEFAULT_CHALLENGE_DIFFICULTY + (1300 - DEFAULT_CHALLENGE_DIFFICULTY) * 0.3,
    );
  });

  it("pulls rating down after two consecutive incorrects", () => {
    const start = {
      currentDifficultyRating: 1200,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
    };
    const first = applyChallengeDifficultyOutcome(start, 900, false);
    expect(first.currentDifficultyRating).toBe(1200);
    const second = applyChallengeDifficultyOutcome(first, 900, false);
    expect(second.consecutiveIncorrect).toBe(2);
    expect(second.currentDifficultyRating).toBe(1200 - (1200 - 900) * 0.2);
  });

  it("resets the opposite streak on outcome flip", () => {
    const afterCorrect = applyChallengeDifficultyOutcome(
      { currentDifficultyRating: 1000, consecutiveCorrect: 3, consecutiveIncorrect: 0 },
      1100,
      false,
    );
    expect(afterCorrect.consecutiveCorrect).toBe(0);
    expect(afterCorrect.consecutiveIncorrect).toBe(1);
  });

  it("prefers items inside the difficulty band and falls back otherwise", () => {
    const items = [
      { id: "near", difficultyRating: 1050 },
      { id: "far", difficultyRating: 1600 },
    ];
    expect(preferItemsNearChallengeDifficulty(items, 1000).map((i) => i.id)).toEqual(["near"]);
    expect(
      preferItemsNearChallengeDifficulty([{ id: "only", difficultyRating: 1800 }], 1000).map(
        (i) => i.id,
      ),
    ).toEqual(["only"]);
    expect(isItemNearChallengeDifficulty(1149, 1000)).toBe(true);
    expect(isItemNearChallengeDifficulty(1150, 1000)).toBe(false);
  });
});

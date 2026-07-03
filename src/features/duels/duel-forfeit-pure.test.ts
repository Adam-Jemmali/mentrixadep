import { describe, expect, it } from "vitest";
import {
  duelForfeitResultCopy,
  forfeitWinnerSide,
  padDuelAnswersForScoring,
} from "@/features/duels/duel-forfeit-pure";

describe("duel-forfeit-pure", () => {
  it("pads missing answers with -1", () => {
    expect(padDuelAnswersForScoring([0, 1], 4)).toEqual([0, 1, -1, -1]);
    expect(padDuelAnswersForScoring(null, 3)).toEqual([-1, -1, -1]);
  });

  it("awards bot win when human leaves spar", () => {
    expect(
      forfeitWinnerSide({
        isAiOpponent: true,
        forfeiterUserId: "student-1",
        studentId: "student-1",
        opponentStudentId: null,
      }),
    ).toBe("opponent");
  });

  it("awards walkover to the player who stayed", () => {
    expect(
      forfeitWinnerSide({
        isAiOpponent: false,
        forfeiterUserId: "student-1",
        studentId: "student-1",
        opponentStudentId: "student-2",
      }),
    ).toBe("opponent");

    expect(
      forfeitWinnerSide({
        isAiOpponent: false,
        forfeiterUserId: "student-2",
        studentId: "student-1",
        opponentStudentId: "student-2",
      }),
    ).toBe("student");
  });

  it("describes walkover copy for both sides", () => {
    expect(
      duelForfeitResultCopy({
        youLeft: true,
        opponentLeft: false,
        themLabel: "Opponent",
        youWon: false,
      }).headline,
    ).toBe("You left the match");

    expect(
      duelForfeitResultCopy({
        youLeft: false,
        opponentLeft: true,
        themLabel: "Sparring Quest",
        youWon: true,
      }).detail,
    ).toContain("Sparring Quest left");
  });
});

import { describe, expect, it } from "vitest";
import {
  duelOutcomeForViewer,
  formatDuelBattleLogSummary,
  isApCalcQuestForBattleLog,
  truncateBattleLogSummary,
} from "@/features/student-profile/battle-log-pure";

describe("isApCalcQuestForBattleLog", () => {
  it("accepts AP Calculus AB practice packs", () => {
    expect(
      isApCalcQuestForBattleLog(
        { course: "AP Calculus AB" },
        "Practice: AP Calculus AB — intermediate (mcq)",
      ),
    ).toBe(true);
  });

  it("rejects legacy English practice", () => {
    expect(
      isApCalcQuestForBattleLog(null, "Practice: English — intermediate (mcq)"),
    ).toBe(false);
  });

  it("rejects legacy free-text CS prompts", () => {
    expect(isApCalcQuestForBattleLog(null, "Difference between stack and heap?")).toBe(
      false,
    );
  });
});

describe("duelOutcomeForViewer", () => {
  const studentId = "11111111-1111-1111-1111-111111111111";
  const opponentId = "22222222-2222-2222-2222-222222222222";

  it("marks student win when challenger wins", () => {
    expect(
      duelOutcomeForViewer({
        viewerId: studentId,
        studentId,
        opponentStudentId: opponentId,
        winner: "student",
      }),
    ).toBe("win");
  });

  it("marks opponent loss when challenger wins", () => {
    expect(
      duelOutcomeForViewer({
        viewerId: opponentId,
        studentId,
        opponentStudentId: opponentId,
        winner: "student",
      }),
    ).toBe("loss");
  });
});

describe("formatDuelBattleLogSummary", () => {
  it("formats win copy", () => {
    expect(
      formatDuelBattleLogSummary({ outcome: "win", opponentLabel: "Sparring Quest" }),
    ).toBe("Duel Win vs Sparring Quest");
  });
});

describe("truncateBattleLogSummary", () => {
  it("truncates long prompts", () => {
    const long = "a".repeat(100);
    expect(truncateBattleLogSummary(long).endsWith("…")).toBe(true);
    expect(truncateBattleLogSummary(long).length).toBeLessThanOrEqual(72);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildApCalcGuestDiagnosticVerdict,
  buildApCalcGuestResultsSummary,
} from "@/features/quest/guest-try-results";
import type { GuestTryQuestion } from "@/features/quest/guest-try-types";

function apCalcQ(
  partial: Partial<GuestTryQuestion> & Pick<GuestTryQuestion, "id">
): GuestTryQuestion {
  return {
    kind: "mcq",
    prompt: "What is the derivative of x^2?",
    explanation: "Use the power rule.",
    options: ["2x", "x", "x^2", "2"],
    correctIndex: 0,
    unitNumber: 1,
    unitName: "Limits and Continuity",
    nodeName: "Introducing limits",
    distractorTags: { x: "confused power with coefficient" },
    examStakes: "Limits appear on every AP Calculus AB exam.",
    ...partial,
  };
}

describe("buildApCalcGuestDiagnosticVerdict", () => {
  it("builds gut-punch verdict for weakest node", () => {
    const questions = [
      apCalcQ({
        id: "a",
        unitNumber: 6,
        unitName: "Integration",
        nodeName: "Definite integrals",
        skillNodeId: "node-b",
        distractorTags: { "0": "forgot to evaluate at bounds" },
      }),
      apCalcQ({
        id: "b",
        unitNumber: 3,
        unitName: "Chain Rule",
        nodeName: "Chain rule basics",
        skillNodeId: "node-a",
      }),
    ];

    const verdict = buildApCalcGuestDiagnosticVerdict(questions, [false, true], [2, 0]);
    expect(verdict?.verdictLine1).toBe("You do not know Definite integrals.");
    expect(verdict?.verdictLine2).toBe("You think you do. You do not.");
    expect(verdict?.gapSentence).toContain("forgot to evaluate at bounds");
    expect(verdict?.trapInsight).toContain("forgot to evaluate at bounds");
    expect(verdict?.stakesSentence).toContain("AP Calculus AB");
    expect(verdict?.examStakes).toContain("AP Calculus AB");
    expect(verdict?.scoreFootnote).toBe("1 of 2 correct on this sample");
  });

  it("uses alternate verdict when all correct", () => {
    const questions = [apCalcQ({ id: "a", skillNodeId: "node-a" })];
    const verdict = buildApCalcGuestDiagnosticVerdict(questions, [true], [0]);
    expect(verdict?.allCorrect).toBe(true);
    expect(verdict?.verdictLine1).toContain("Nothing broke");
  });
});

describe("buildApCalcGuestResultsSummary", () => {
  it("builds unit breakdown and weakest area by lowest fraction", () => {
    const questions = [
      apCalcQ({
        id: "a",
        unitNumber: 3,
        unitName: "Chain Rule and Implicit",
        nodeName: "Chain rule basics",
        skillNodeId: "node-a",
      }),
      apCalcQ({
        id: "b",
        unitNumber: 3,
        unitName: "Chain Rule and Implicit",
        nodeName: "Chain rule basics",
        skillNodeId: "node-a",
      }),
      apCalcQ({
        id: "c",
        unitNumber: 6,
        unitName: "Integration",
        nodeName: "Definite integrals",
        skillNodeId: "node-b",
      }),
    ];

    const summary = buildApCalcGuestResultsSummary(questions, [true, false, false]);
    expect(summary?.scoreLine).toBe("1 of 3 correct on this sample");
    expect(summary?.unitLines).toEqual([
      "Unit 3 Chain Rule and Implicit: 1 of 2 correct",
      "Unit 6 Integration: 0 of 1 correct",
    ]);
    expect(summary?.weakestLine).toBe("Your weakest area: Definite integrals");
  });
});

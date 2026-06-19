import { describe, expect, it } from "vitest";
import { buildApCalcGuestResultsSummary } from "@/features/quest/guest-try-results";
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
    ...partial,
  };
}

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
    expect(summary?.scoreLine).toBe("1 of 3 correct");
    expect(summary?.unitLines).toEqual([
      "Unit 3 Chain Rule and Implicit: 1 of 2 correct",
      "Unit 6 Integration: 0 of 1 correct",
    ]);
    expect(summary?.weakestLine).toBe("Your weakest area: Integration, Definite integrals");
  });

  it("breaks ties on weakest area by earliest unit number", () => {
    const questions = [
      apCalcQ({
        id: "a",
        unitNumber: 2,
        unitName: "Differentiation",
        nodeName: "Product rule",
        skillNodeId: "node-a",
      }),
      apCalcQ({
        id: "b",
        unitNumber: 5,
        unitName: "Analytical Applications",
        nodeName: "Optimization",
        skillNodeId: "node-b",
      }),
    ];

    const summary = buildApCalcGuestResultsSummary(questions, [false, false]);
    expect(summary?.weakestLine).toBe(
      "Your weakest area: Differentiation, Product rule"
    );
  });
});

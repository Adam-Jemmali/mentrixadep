import { describe, expect, it } from "vitest";
import {
  computePracticePackQuestionCount,
  hasApprovedCoverageForNodes,
  pickNeededNodeIds,
} from "@/features/quest/item-bank-selector";
import { AP_CALC_AB_UNAVAILABLE_MESSAGE } from "@/features/quest/ap-calc-ab-subject";

describe("item bank selector coverage guards", () => {
  it("clamps practice pack size to 5–10", () => {
    expect(computePracticePackQuestionCount(3)).toBe(5);
    expect(computePracticePackQuestionCount(7)).toBe(7);
    expect(computePracticePackQuestionCount(12)).toBe(10);
  });

  it("picks unique needed node ids in priority order", () => {
    expect(pickNeededNodeIds(["a", "b", "a", "c"], 3)).toEqual(["a", "b", "c"]);
    expect(pickNeededNodeIds(["a", "b"], 5)).toEqual(["a", "b"]);
  });

  it("requires approved items for every needed node", () => {
    const itemsByNode = new Map([
      ["n1", [{ id: "1" }]],
      ["n2", []],
    ]);
    expect(hasApprovedCoverageForNodes(["n1"], itemsByNode as never)).toBe(true);
    expect(hasApprovedCoverageForNodes(["n1", "n2"], itemsByNode as never)).toBe(false);
  });
});

describe("AP Calculus AB unavailable copy", () => {
  it("uses the exact no-substitution message", () => {
    expect(AP_CALC_AB_UNAVAILABLE_MESSAGE).toBe(
      "AP Calculus AB practice is being prepared for this topic. Check back shortly."
    );
  });
});

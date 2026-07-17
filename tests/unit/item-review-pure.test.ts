import { describe, expect, it } from "vitest";
import {
  itemFormatLabel,
  itemReviewEmptyMessage,
  itemReviewNextAction,
  truncatePrompt,
  validateFreeResponseForApprove,
} from "@/features/admin/item-review-pure";

describe("item-review-pure", () => {
  it("labels formats briefly", () => {
    expect(itemFormatLabel("free_response")).toBe("Free response");
    expect(itemFormatLabel("mcq")).toBe("MCQ");
  });

  it("blocks free-response approve without critical step", () => {
    const reasons = validateFreeResponseForApprove({
      itemFormat: "free_response",
      answerExpression: "3*x^2",
      solutionSteps: [{ expression: "3*x^2", is_critical: false }],
      difficultyRating: 1000,
      expressionParses: () => true,
    });
    expect(reasons[0]).toMatch(/critical/i);
  });

  it("allows sound free-response approve input", () => {
    const reasons = validateFreeResponseForApprove({
      itemFormat: "free_response",
      answerExpression: "3*x^2",
      solutionSteps: [{ expression: "3*x^2", is_critical: true }],
      difficultyRating: 1000,
      expressionParses: () => true,
    });
    expect(reasons).toEqual([]);
  });

  it("keeps empty and next-action copy short", () => {
    expect(itemReviewEmptyMessage("pending_review")).toMatch(/Queue clear/);
    expect(itemReviewNextAction(0)).toMatch(/generate-candidates/);
    expect(truncatePrompt("a".repeat(200), 20).endsWith("…")).toBe(true);
  });
});

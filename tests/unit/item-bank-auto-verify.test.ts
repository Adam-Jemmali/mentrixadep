import { describe, expect, it } from "vitest";
import {
  normalizeQuestion,
  resolveCorrectAnswer,
  validateStructure,
} from "../../scripts/lib/item-bank-auto-verify";

const baseQuestion = {
  prompt: "What is the derivative of f(x) = x^2 at x = 3?",
  options: ["3", "6", "9", "0"] as [string, string, string, string],
  correct_answer: "6",
  explanation: "f'(x) = 2x, so f'(3) = 6.",
  distractor_tags: { "3": "forgot chain", "9": "used x^2" },
};

describe("item-bank-auto-verify structure", () => {
  it("accepts a valid MCQ shape", () => {
    const normalized = normalizeQuestion(baseQuestion);
    expect(validateStructure(normalized)).toBeNull();
  });

  it("rejects duplicate options", () => {
    const bad = normalizeQuestion({
      ...baseQuestion,
      options: ["6", "6", "9", "0"],
    });
    expect(validateStructure(bad)).toBe("options must be distinct");
  });

  it("resolves letter keyed correct answers", () => {
    expect(resolveCorrectAnswer(baseQuestion.options, "B")).toBe("6");
  });
});

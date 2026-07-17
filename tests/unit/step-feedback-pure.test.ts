import { describe, expect, it } from "vitest";
import {
  diffExpressionParts,
  expressionAligns,
  findDivergeStepIndex,
  hasStepFeedbackTrace,
  matchPartialCredit,
  parsePartialCreditRules,
  parseSolutionSteps,
  resolveCorrectAnswerExpression,
  type SolutionStep,
} from "@/features/quest/components/step-feedback-pure";

const STEPS: SolutionStep[] = [
  {
    step_number: 1,
    description: "Apply power rule",
    expression: "2x",
    misconception_if_skipped: "You treated x^2 as linear.",
    is_critical: true,
  },
  {
    step_number: 2,
    description: "Evaluate at bound",
    expression: "2(3)=6",
    misconception_if_skipped: "You stopped before substitution.",
    is_critical: false,
  },
];

describe("parseSolutionSteps", () => {
  it("parses and sorts steps", () => {
    const parsed = parseSolutionSteps([
      { step_number: 2, description: "B", expression: "b" },
      { step_number: 1, description: "A", expression: "a" },
    ]);
    expect(parsed.map((s) => s.step_number)).toEqual([1, 2]);
  });
});

describe("findDivergeStepIndex", () => {
  it("marks first step student misses while correct answer aligns", () => {
    const index = findDivergeStepIndex(STEPS, "x", "2x");
    expect(index).toBe(0);
  });

  it("falls back to first critical step", () => {
    const index = findDivergeStepIndex(STEPS, "wrong", "also-wrong");
    expect(index).toBe(0);
  });
});

describe("diffExpressionParts", () => {
  it("highlights first mismatching token", () => {
    const diff = diffExpressionParts("2x + 1", "2x + 2");
    expect(diff.studentParts.some((p) => p.highlight)).toBe(true);
    expect(diff.correctParts.some((p) => p.highlight)).toBe(true);
    expect(diff.firstMismatchToken).toBe("1");
  });
});

describe("matchPartialCredit", () => {
  it("returns partial summary when pattern matches", () => {
    const rules = parsePartialCreditRules([
      { expression_pattern: "2x", credit_fraction: 0.5, label: "Derivative setup" },
    ]);
    const partial = matchPartialCredit("2x + 1", rules, "2x + 2");
    expect(partial?.label).toBe("Derivative setup");
    expect(partial?.creditFraction).toBe(0.5);
  });
});

describe("resolveCorrectAnswerExpression", () => {
  it("prefers answer_expression then option then final step", () => {
    expect(resolveCorrectAnswerExpression("A", "\\pi", STEPS)).toBe("\\pi");
    expect(resolveCorrectAnswerExpression("A", "", STEPS)).toBe("A");
    expect(resolveCorrectAnswerExpression("", "", STEPS)).toBe("2(3)=6");
  });
});

describe("expressionAligns", () => {
  it("treats substring overlap as aligned", () => {
    expect(expressionAligns("f'(x)=2x", "2x")).toBe(true);
    expect(hasStepFeedbackTrace(STEPS)).toBe(true);
    expect(hasStepFeedbackTrace([])).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  validateFreeResponseCandidate,
  buildFreeResponseGenerationPrompt,
} from "./lib/free-response-candidate-pure";

describe("free-response-candidate-pure", () => {
  it("accepts a parseable candidate with a critical step", () => {
    const issue = validateFreeResponseCandidate({
      prompt: "Differentiate f(x) = x^3 with respect to x.",
      answer_expression: "3*x^2",
      answer_alternatives: ["3x^2"],
      explanation: "Apply the power rule. Multiply by the exponent and reduce the power by one.",
      difficulty_rating: 1000,
      solution_steps: [
        {
          step_number: 1,
          description: "Identify power",
          expression: "x^3",
          misconception_if_skipped: "Wrong rule",
          is_critical: false,
        },
        {
          step_number: 2,
          description: "Apply power rule",
          expression: "3*x^2",
          misconception_if_skipped: "Forgot coefficient",
          is_critical: true,
        },
      ],
      partial_credit_rules: [
        { expression_pattern: "x^2", credit_fraction: 0.5, label: "Power only" },
      ],
    });
    expect(issue).toBeNull();
  });

  it("rejects unparseable answer expressions", () => {
    const issue = validateFreeResponseCandidate({
      prompt: "Differentiate f(x) = x^3 with respect to x.",
      answer_expression: "(((broken",
      answer_alternatives: [],
      explanation: "Apply the power rule. Multiply by the exponent and reduce the power by one.",
      difficulty_rating: 1000,
      solution_steps: [
        {
          step_number: 1,
          description: "Identify power",
          expression: "x^3",
          misconception_if_skipped: "Wrong rule",
          is_critical: true,
        },
        {
          step_number: 2,
          description: "Apply power rule",
          expression: "3*x^2",
          misconception_if_skipped: "Forgot coefficient",
          is_critical: false,
        },
      ],
      partial_credit_rules: [],
    });
    expect(issue).toMatch(/does not parse/);
  });

  it("builds a focused free-response prompt", () => {
    const prompt = buildFreeResponseGenerationPrompt({
      nodeName: "Power rule",
      description: "Differentiate x^n",
      misconceptions: ["Forgets coefficient"],
    });
    expect(prompt).toContain("free_response");
    expect(prompt).toContain("Power rule");
    expect(prompt).toContain("is_critical");
  });
});

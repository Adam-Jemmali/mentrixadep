import { describe, expect, it } from "vitest";
import { getDiagnosticVerdict } from "@/features/diagnostics/diagnostic-verdict";
import type { StepTraceProblem } from "@/features/diagnostics/step-trace-types";
import { buildStepTraceCompletion } from "@/features/diagnostics/step-trace-types";
import { MIN_PEER_COMPARISON_SAMPLE } from "@/features/comparison/comparison-context-pure";

const problem: StepTraceProblem = {
  itemId: "item-1",
  prompt: "Find $\\frac{d}{dx}(3x^2)$.",
  skillNodeId: "node-power",
  nodeName: "Power rule",
  examStakes: "The power rule appears on every AP Calculus AB exam.",
  stepSequence: [
    {
      step_number: 1,
      prompt: "Which rule applies?",
      options: ["Power rule", "Product rule", "Quotient rule"],
      correct_option_index: 0,
      misconception_tag_per_wrong_option: {
        "Product rule": "confuses monomial with product",
      },
    },
    {
      step_number: 2,
      prompt: "Differentiate the coefficient.",
      options: ["$6x$", "$3x$", "$6$"],
      correct_option_index: 0,
      misconception_tag_per_wrong_option: {
        "$3x$": "drops power after differentiate",
      },
    },
  ],
};

describe("getDiagnosticVerdict", () => {
  it("returns strong-student copy when every step is correct on first try", () => {
    const completion = buildStepTraceCompletion(problem, [
      {
        step_number: 1,
        picks: [0],
        misconception_tags: [],
        resolved_correctly: true,
        required_reveal: false,
      },
      {
        step_number: 2,
        picks: [0],
        misconception_tags: [],
        resolved_correctly: true,
        required_reveal: false,
      },
    ]);

    const verdict = getDiagnosticVerdict({
      problem,
      completion,
      peerAccuracyBuckets: [
        { accuracyBucket: 0, userCount: 30 },
        { accuracyBucket: 90, userCount: 70 },
      ],
    });

    expect(verdict?.allCorrectFirstTry).toBe(true);
    expect(verdict?.headline).toContain("strong AP Calculus AB student");
    expect(verdict?.subheadline).toBe("Power rule is genuinely solid for you.");
    expect(verdict?.comparisonSentence).toBe(
      "Better than 30% of everyone verified on this node.",
    );
    expect(verdict?.scoreFootnote).toBe("2 of 2 steps correct on first answer");
    expect(verdict?.ctaLabel).toBe("Save this and start fixing it");
  });

  it("omits comparison when peer sample is too small", () => {
    const completion = buildStepTraceCompletion(problem, [
      {
        step_number: 1,
        picks: [0],
        misconception_tags: [],
        resolved_correctly: true,
        required_reveal: false,
      },
      {
        step_number: 2,
        picks: [0],
        misconception_tags: [],
        resolved_correctly: true,
        required_reveal: false,
      },
    ]);

    const verdict = getDiagnosticVerdict({
      problem,
      completion,
      peerAccuracyBuckets: [
        { accuracyBucket: 0, userCount: 4 },
        { accuracyBucket: 90, userCount: 5 },
      ],
    });

    expect(verdict?.comparisonSentence).toBeNull();
    expect(MIN_PEER_COMPARISON_SAMPLE).toBe(10);
  });

  it("targets the first divergence, not the noisiest later miss", () => {
    const completion = buildStepTraceCompletion(problem, [
      {
        step_number: 1,
        picks: [1, 0],
        misconception_tags: ["confuses monomial with product"],
        resolved_correctly: false,
        required_reveal: false,
      },
      {
        step_number: 2,
        picks: [1, 2, 0],
        misconception_tags: ["drops power after differentiate", "forgets variable"],
        resolved_correctly: false,
        required_reveal: true,
      },
    ]);

    const verdict = getDiagnosticVerdict({ problem, completion });

    expect(verdict?.allCorrectFirstTry).toBe(false);
    expect(verdict?.headline).toBe(
      "You do not know Power rule the way you think you do.",
    );
    expect(verdict?.breakdownSentence).toBe(
      "Your reasoning broke at step 1: Confuses monomial with product",
    );
    expect(verdict?.stepComparison).toEqual({
      stepNumber: 1,
      stepPrompt: "Which rule applies?",
      misconceptionDescription: "Confuses monomial with product",
      userChoice: "Product rule",
      correctChoice: "Power rule",
    });
    expect(verdict?.stakesSentence).toContain("AP Calculus AB exam");
    expect(verdict?.scoreFootnote).toBe("0 of 2 steps correct on first answer");
  });

  it("returns null when completion does not cover every step", () => {
    const completion = buildStepTraceCompletion(problem, [
      {
        step_number: 1,
        picks: [0],
        misconception_tags: [],
        resolved_correctly: true,
        required_reveal: false,
      },
    ]);

    expect(getDiagnosticVerdict({ problem, completion })).toBeNull();
  });
});

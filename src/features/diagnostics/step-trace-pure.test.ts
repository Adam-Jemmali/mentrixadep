import { describe, expect, it } from "vitest";
import {
  applyStepTracePick,
  continueAfterStepReveal,
  createStepTraceSession,
} from "@/features/diagnostics/step-trace-pure";
import type { StepTraceProblem } from "@/features/diagnostics/step-trace-types";

const problem: StepTraceProblem = {
  itemId: "item-1",
  prompt: "Find $\\frac{d}{dx}(3x^2)$.",
  skillNodeId: "node-1",
  stepSequence: [
    {
      step_number: 1,
      prompt: "Which rule applies?",
      options: ["Power rule", "Product rule", "Quotient rule"],
      correct_option_index: 0,
      misconception_tag_per_wrong_option: {
        "Product rule": "confuses monomial with product",
        "Quotient rule": "over-applies quotient rule",
      },
    },
    {
      step_number: 2,
      prompt: "Differentiate the coefficient.",
      options: ["$6x$", "$3x$", "$6$"],
      correct_option_index: 0,
      misconception_tag_per_wrong_option: {
        "$3x$": "drops power after differentiate",
        "$6$": "forgets variable",
      },
    },
  ],
};

describe("applyStepTracePick", () => {
  it("advances on first-try correct pick", () => {
    let state = createStepTraceSession(problem);
    const outcome = applyStepTracePick(problem, state, 0);
    expect(outcome?.kind).toBe("correct_advance");
    state = outcome!.next;
    expect(state.currentStepIndex).toBe(1);
    expect(state.stepResults).toHaveLength(1);
    expect(state.stepResults[0]?.resolved_correctly).toBe(true);
  });

  it("allows one retry then reveals correct move", () => {
    let state = createStepTraceSession(problem);
    const first = applyStepTracePick(problem, state, 1);
    expect(first?.kind).toBe("wrong_retry");
    state = first!.next;
    expect(state.liveSteps[0]?.wrongAttempts).toBe(1);

    const second = applyStepTracePick(problem, state, 2);
    expect(second?.kind).toBe("wrong_reveal");
    state = second!.next;
    expect(state.liveSteps[0]?.revealed).toBe(true);
    expect(state.liveSteps[0]?.awaitingContinue).toBe(true);
    expect(state.stepResults[0]?.misconception_tags).toEqual([
      "confuses monomial with product",
      "over-applies quotient rule",
    ]);
    expect(state.stepResults[0]?.required_reveal).toBe(true);
  });

  it("completes after continuing through reveal", () => {
    let state = createStepTraceSession(problem);
    state = applyStepTracePick(problem, state, 1)!.next;
    state = applyStepTracePick(problem, state, 2)!.next;
    state = continueAfterStepReveal(problem, state)!.next;
    expect(state.currentStepIndex).toBe(1);

    state = applyStepTracePick(problem, state, 0)!.next;
    expect(state.complete).toBe(true);
    expect(state.completion?.misconception_tags).toContain("confuses monomial with product");
    expect(state.completion?.steps_correct_first_try).toBe(1);
    expect(state.completion?.total_steps).toBe(2);
  });

  it("records misconception on retry success without reveal", () => {
    let state = createStepTraceSession(problem);
    state = applyStepTracePick(problem, state, 1)!.next;
    state = applyStepTracePick(problem, state, 0)!.next;
    expect(state.stepResults[0]?.resolved_correctly).toBe(false);
    expect(state.stepResults[0]?.required_reveal).toBe(false);
    expect(state.stepResults[0]?.misconception_tags).toEqual(["confuses monomial with product"]);
  });
});

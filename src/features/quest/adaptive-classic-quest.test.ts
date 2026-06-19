import { describe, expect, it } from "vitest";
import { buildAdaptiveTurnFallback } from "@/shared/integrations/ai/adaptive-quest";
import {
  advanceAdaptiveWorldState,
  createOpeningWorldState,
  isSubstantiveAdaptiveAnswer,
} from "@/features/quest/adaptive-quest-steps";

describe("adaptive classic quest AI fallback", () => {
  it("opens a 3-step analogy scenario tied to the learner question", () => {
    const result = buildAdaptiveTurnFallback("Explain dynamic programming.", null);
    expect(result.updatedWorldState.stepIndex).toBe(1);
    expect(result.updatedWorldState.stepTotal).toBe(3);
    expect(result.updatedWorldState.scenarioPrinciple).toContain("dynamic programming");
    expect(result.feedback).toContain("analogy");
    expect(result.updatedWorldState.currentChallenge).toContain("Step 1 of 3");
    expect(result.updatedWorldState.currentChallenge).toContain("dynamic programming");
    expect(result.isResolved).toBe(false);
  });

  it("advances to step 2 after a substantive answer", () => {
    const opening = createOpeningWorldState("Explain dynamic programming.");
    const answer =
      "Dynamic programming solves overlapping subproblems once and stores results to avoid repeated work.";
    expect(isSubstantiveAdaptiveAnswer(answer)).toBe(true);

    const result = buildAdaptiveTurnFallback(answer, opening, "Explain dynamic programming.");
    expect(result.updatedWorldState.stepIndex).toBe(2);
    expect(result.updatedWorldState.currentChallenge).toContain("Step 2 of 3");
    expect(result.updatedWorldState.currentChallenge).toContain("analogy");
    expect(result.feedback).toContain("Step 1 complete");
    expect(result.isResolved).toBe(false);
  });

  it("resolves after the third substantive step answers the original question", () => {
    const step3 = {
      ...createOpeningWorldState("Explain dynamic programming."),
      stepIndex: 3,
      currentChallenge:
        'Step 3 of 3: Answer the original question directly: "Explain dynamic programming." Give a complete answer.',
    };
    const answer =
      "Dynamic programming breaks a problem into overlapping subproblems, stores each result once, and reuses them to avoid redundant work — like memoizing recursive calls in a table.";
    const progressed = advanceAdaptiveWorldState(step3, "Explain dynamic programming.", true);
    expect(progressed.isResolved).toBe(true);
    expect(progressed.feedback).toContain("original question");
  });
});

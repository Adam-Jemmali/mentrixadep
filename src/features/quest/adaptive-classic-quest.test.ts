import { describe, expect, it } from "vitest";
import { buildAdaptiveTurnFallback } from "@/shared/integrations/ai/adaptive-quest";
import {
  advanceAdaptiveWorldState,
  createOpeningWorldState,
  isSubstantiveAdaptiveAnswer,
} from "@/features/quest/adaptive-quest-steps";

describe("adaptive classic quest AI fallback", () => {
  it("opens a 3-step scenario tied to the learner question", () => {
    const result = buildAdaptiveTurnFallback("Explain dynamic programming.", null);
    expect(result.updatedWorldState.stepIndex).toBe(1);
    expect(result.updatedWorldState.stepTotal).toBe(3);
    expect(result.feedback).toContain("3 short steps");
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
    expect(result.feedback).toContain("Step 1 complete");
    expect(result.isResolved).toBe(false);
  });

  it("resolves after the third substantive step", () => {
    const step3 = {
      ...createOpeningWorldState("Explain dynamic programming."),
      stepIndex: 3,
      currentChallenge: "Step 3 of 3: Name one common mistake with dynamic programming and how to avoid it.",
    };
    const answer =
      "A common mistake is not identifying overlapping subproblems. Build a table only after writing the recurrence.";
    const progressed = advanceAdaptiveWorldState(step3, "Explain dynamic programming.", true);
    expect(progressed.isResolved).toBe(true);
  });
});

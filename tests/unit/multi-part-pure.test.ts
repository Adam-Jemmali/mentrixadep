import { describe, expect, it } from "vitest";
import {
  applyMultiPartAttempt,
  computeMultiPartXp,
  countMultiPartCorrect,
  formatMultiPartXpLine,
  multiPartCarryForwardLabel,
  multiPartUiState,
  MULTI_PART_MAX_ATTEMPTS,
  parseMultiPartParts,
} from "@/features/quest/multi-part-pure";

describe("multi-part-pure", () => {
  it("parses multi-part solution_steps arrays", () => {
    const parts = parseMultiPartParts([
      {
        part_key: "a",
        prompt: "Let f(x)=x^2.",
        item_format: "free_response",
        answer_expression: "x**2",
      },
      {
        part_key: "b",
        prompt: "Find f'(x).",
        item_format: "free_response",
        answer_expression: "2*x",
        solution_steps: [
          {
            step_number: 1,
            description: "Power rule",
            expression: "2x",
            misconception_if_skipped: "Forgot power rule",
            is_critical: true,
          },
        ],
      },
      {
        part_key: "c",
        prompt: "Which is a critical point?",
        item_format: "mcq",
        options: ["x=0", "x=1", "x=2", "x=3"],
        correct_answer: "x=0",
      },
    ]);
    expect(parts).toHaveLength(3);
    expect(parts[0]?.itemFormat).toBe("free_response");
    expect(parts[2]?.correctIndex).toBe(0);
    expect(parts[1]?.solutionSteps?.[0]?.description).toBe("Power rule");
  });

  it("locks later parts until earlier ones finish", () => {
    expect(multiPartUiState(0, 0, 0)).toBe("active");
    expect(multiPartUiState(1, 0, 0)).toBe("locked");
    expect(multiPartUiState(0, 1, 1)).toBe("done");
    expect(multiPartUiState(1, 1, 1)).toBe("active");
  });

  it("allows retries then carries forward the correct answer", () => {
    const part = {
      partKey: "a",
      prompt: "Derivative",
      itemFormat: "free_response" as const,
      answerExpression: "2*x",
      correctAnswer: "2x",
    };
    const first = applyMultiPartAttempt({
      part,
      correct: false,
      studentAnswer: "x",
    });
    expect(first.unlockNext).toBe(false);
    expect(first.retriesLeft).toBe(MULTI_PART_MAX_ATTEMPTS - 1);

    const second = applyMultiPartAttempt({
      part,
      prior: first.result,
      correct: false,
      studentAnswer: "x^2",
    });
    expect(second.unlockNext).toBe(false);

    const third = applyMultiPartAttempt({
      part,
      prior: second.result,
      correct: false,
      studentAnswer: "3x",
    });
    expect(third.unlockNext).toBe(true);
    expect(third.result.carriedForward).toBe(true);
    expect(third.result.revealedAnswer).toBe("2*x");
    expect(multiPartCarryForwardLabel("a")).toContain("carried forward");
  });

  it("awards partial XP from parts correct", () => {
    expect(computeMultiPartXp(2, 4, 75)).toBe(38);
    expect(computeMultiPartXp(4, 4, 75)).toBe(75);
    expect(formatMultiPartXpLine(2, 4, 38)).toBe("+38 XP · 2/4 parts");
    expect(
      countMultiPartCorrect([
        { partKey: "a", correct: true, attempts: 1, carriedForward: false },
        { partKey: "b", correct: false, attempts: 3, carriedForward: true },
      ]),
    ).toBe(1);
  });
});

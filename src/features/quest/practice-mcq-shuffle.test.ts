import { describe, expect, it } from "vitest";
import { shuffleMcqQuestionOptions, shufflePracticePackMcqOptions } from "@/features/quest/practice-mcq-shuffle";
import type { PracticeQuestionMcq } from "@/features/quest/practice-quest-types";

const sample: PracticeQuestionMcq = {
  id: "q1",
  kind: "mcq",
  prompt: "Pick one",
  options: ["correct", "wrong-a", "wrong-b", "wrong-c"],
  correctIndex: 0,
  explanation: "Because correct.",
};

describe("shuffleMcqQuestionOptions", () => {
  it("preserves the correct answer text at the new index", () => {
    const shuffled = shuffleMcqQuestionOptions(sample, () => 0.99);
    expect(shuffled.options[shuffled.correctIndex]).toBe("correct");
    expect(shuffled.options.sort()).toEqual(sample.options.sort());
  });

  it("can move the correct answer away from index 0", () => {
    let moved = false;
    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleMcqQuestionOptions(sample);
      if (shuffled.correctIndex !== 0) moved = true;
    }
    expect(moved).toBe(true);
  });

  it("shuffles only mcq questions in a pack", () => {
    const pack = shufflePracticePackMcqOptions([
      sample,
      {
        id: "w1",
        kind: "short_answer",
        prompt: "Explain",
        referenceAnswer: "Because",
        explanation: "Because",
      },
    ]);
    expect(pack[0]?.kind).toBe("mcq");
    expect(pack[1]?.kind).toBe("short_answer");
    if (pack[0]?.kind === "mcq") {
      expect(pack[0].options[pack[0].correctIndex]).toBe("correct");
    }
  });
});

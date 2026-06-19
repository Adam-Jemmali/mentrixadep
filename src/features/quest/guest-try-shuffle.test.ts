import { describe, expect, it } from "vitest";
import { shuffleGuestTryQuestion } from "@/features/quest/guest-try-shuffle";
import type { GuestTryQuestion } from "@/features/quest/guest-try-types";

describe("shuffleGuestTryQuestion", () => {
  it("moves the correct answer away from index 0 for MCQ", () => {
    const q: GuestTryQuestion = {
      id: "1",
      kind: "mcq",
      prompt: "Pick one",
      explanation: "Because",
      options: ["correct", "b", "c", "d"],
      correctIndex: 0,
    };
    let moved = false;
    for (let i = 0; i < 24; i += 1) {
      const shuffled = shuffleGuestTryQuestion(q);
      expect(shuffled.options![shuffled.correctIndex!]).toBe("correct");
      if (shuffled.correctIndex !== 0) moved = true;
    }
    expect(moved).toBe(true);
  });

  it("keeps option images aligned with shuffled choices", () => {
    const q: GuestTryQuestion = {
      id: "2",
      kind: "image_mcq",
      prompt: "Which graph?",
      explanation: "The parabola opens up.",
      options: ["up", "down", "flat", "none"],
      optionImageUrls: ["u.png", "d.png", "f.png", "n.png"],
      correctIndex: 0,
    };
    const shuffled = shuffleGuestTryQuestion(q, () => 0.99);
    expect(shuffled.options![shuffled.correctIndex!]).toBe("up");
    expect(shuffled.optionImageUrls![shuffled.correctIndex!]).toBe("u.png");
  });
});

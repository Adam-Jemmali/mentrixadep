import { describe, expect, it } from "vitest";
import { curateGuestTryStudentPack } from "@/features/quest/guest-try-pack-curate";
import { GUEST_TRY_QUEST_COUNT } from "@/features/quest/guest-try-constants";
import type { GuestTryQuestion } from "@/features/quest/guest-try-types";

const easyMcqOnly: GuestTryQuestion[] = Array.from({ length: 6 }, (_, i) => ({
  id: `mcq-${i}`,
  kind: "mcq" as const,
  prompt: `Exam MCQ number ${i} with enough prompt text here.`,
  explanation: "Because the keyed option is correct.",
  options: ["A", "B", "C", "D"],
  correctIndex: 1,
}));

describe("curateGuestTryStudentPack", () => {
  it("pads to target count and injects problem_solving", () => {
    const pack = curateGuestTryStudentPack(easyMcqOnly, "Biology");
    expect(pack.length).toBe(GUEST_TRY_QUEST_COUNT);
    expect(pack.filter((q) => q.kind === "problem_solving").length).toBeGreaterThanOrEqual(3);
  });

  it("limits true/false to at most one", () => {
    const withTf: GuestTryQuestion[] = [
      ...easyMcqOnly,
      {
        id: "tf-1",
        kind: "true_false",
        prompt: "Statement one with enough characters for validation.",
        explanation: "False because qualifiers matter.",
        options: ["True", "False"],
        correctIndex: 1,
      },
      {
        id: "tf-2",
        kind: "true_false",
        prompt: "Statement two with enough characters for validation.",
        explanation: "True under the model assumptions.",
        options: ["True", "False"],
        correctIndex: 0,
      },
    ];
    const pack = curateGuestTryStudentPack(withTf, "General STEM");
    expect(pack.filter((q) => q.kind === "true_false").length).toBeLessThanOrEqual(1);
  });
});

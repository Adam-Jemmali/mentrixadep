import { describe, expect, it } from "vitest";
import { buildUnifiedTrajectoryIndex } from "@/features/trajectory-index/cross-subject-trajectory-pure";

describe("buildUnifiedTrajectoryIndex", () => {
  it("passes through a single subject score", () => {
    const result = buildUnifiedTrajectoryIndex([{ subject: "AP Calculus AB", score: 72 }]);
    expect(result?.score).toBe(72);
    expect(result?.verdict).toContain("AP Calculus AB");
  });

  it("averages multiple subject scores", () => {
    const result = buildUnifiedTrajectoryIndex([
      { subject: "AP Calculus AB", score: 80 },
      { subject: "AP Physics 1", score: 60 },
    ]);
    expect(result?.score).toBe(70);
    expect(result?.verdict).toContain("2 subjects");
  });
});

import { describe, expect, it } from "vitest";
import { buildRankDeltaVerdict } from "@/features/guidance/verdict-engine-pure";

describe("VerdictPanel public passport behavior", () => {
  it("rank_delta verdict includes changed and reason for public copy", () => {
    const verdict = buildRankDeltaVerdict(
      { accuracyPercent: 71, percentile: 99, verifiedCount: 7 },
      { accuracyPercent: 67, percentile: 95 },
      [{ nodeName: "One sided limits", isCorrect: true, skillNodeId: "a", attemptedAt: "" }],
    );
    expect(verdict.changed).toContain("67→71");
    expect(verdict.reason).toContain("One sided limits");
    expect(verdict.nextAction.label.length).toBeGreaterThan(0);
    expect(verdict.rankDelta).toBeTruthy();
  });
});

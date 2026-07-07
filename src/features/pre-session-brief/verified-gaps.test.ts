import { describe, expect, it } from "vitest";
import { formatVerifiedGapLine } from "@/features/pre-session-brief/verified-gaps";

describe("formatVerifiedGapLine", () => {
  it("includes verified first attempt when present", () => {
    expect(
      formatVerifiedGapLine({
        unitName: "Chain Rule and Implicit",
        nodeName: "Chain rule basics",
        verifiedFirstAttempt: false,
        attemptsCount: 5,
        correctCount: 2,
      })
    ).toBe(
      "Chain Rule and Implicit, Chain rule basics: locked first answer incorrect, practice 2 of 5"
    );
  });

  it("omits verified line when no verified attempt exists", () => {
    expect(
      formatVerifiedGapLine({
        unitName: "Integration",
        nodeName: "Definite integrals",
        verifiedFirstAttempt: null,
        attemptsCount: 3,
        correctCount: 1,
      })
    ).toBe("Integration, Definite integrals: practice 1 of 3");
  });
});

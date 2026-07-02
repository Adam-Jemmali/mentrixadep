import { describe, expect, it } from "vitest";
import { subjectPassesMomentumBar, buildSubjectExpansionVerdict } from "@/features/subject-expansion/subject-expansion-pure";

describe("subject-expansion-pure", () => {
  it("marks pre-cleared subjects eligible", () => {
    expect(
      subjectPassesMomentumBar({
        subject: "AP Calculus AB",
        verifiedFirstAttempts: 100,
        reviewedItems: 10,
        gate: {
          momentumEligible: true,
          minVerifiedFirstAttempts: 5000,
          minReviewedItems: 200,
        },
      }),
    ).toBe(true);
  });

  it("describes the bar for locked subjects", () => {
    const copy = buildSubjectExpansionVerdict({
      subject: "AP Physics 1",
      eligible: false,
      verifiedFirstAttempts: 1200,
      minVerifiedFirstAttempts: 5000,
    });
    expect(copy.verdict).toContain("not on the Momentum stack");
    expect(copy.nextAction).toContain("3,800");
  });
});

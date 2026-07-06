import { describe, expect, it } from "vitest";
import {
  buildPassportVerdict,
  passportVerdictPlainText,
  practiceAccuracyToMasteryStateLabel,
} from "@/features/rank-card/rank-passport-pure";

describe("buildPassportVerdict", () => {
  it("returns ranked verdict from percentile", () => {
    expect(buildPassportVerdict({ verifiedCount: 8, percentile: 92 })).toEqual({
      kind: "ranked",
      topPercent: 8,
    });
  });

  it("returns accumulating verdict before five skills", () => {
    expect(buildPassportVerdict({ verifiedCount: 3, percentile: null })).toEqual({
      kind: "accumulating",
      verifiedCount: 3,
      remaining: 2,
    });
  });

  it("returns empty verdict with no attempts", () => {
    expect(buildPassportVerdict({ verifiedCount: 0, percentile: null })).toEqual({
      kind: "empty",
    });
  });
});

describe("passportVerdictPlainText", () => {
  it("formats top percent copy", () => {
    const text = passportVerdictPlainText({ kind: "ranked", topPercent: 12 });
    expect(text).toBe(
      "Top 12 percent of everyone verified on AP Calculus AB, first attempt only, no retakes"
    );
  });
});

describe("practiceAccuracyToMasteryStateLabel", () => {
  it("maps practice accuracy to mastery labels", () => {
    expect(practiceAccuracyToMasteryStateLabel(0)).toBe("not started");
    expect(practiceAccuracyToMasteryStateLabel(55)).toBe("under seventy percent");
    expect(practiceAccuracyToMasteryStateLabel(80)).toBe("solid in practice");
  });
});

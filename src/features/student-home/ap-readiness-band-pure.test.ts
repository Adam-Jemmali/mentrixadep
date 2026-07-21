import { describe, expect, it } from "vitest";
import {
  buildApReadinessBand,
  CALC_READINESS_LABEL,
} from "@/features/student-home/ap-readiness-band-pure";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";

describe("buildApReadinessBand", () => {
  it("returns building state with zero verified", () => {
    const band = buildApReadinessBand({ verifiedCount: 0, accuracyPercent: 0, percentile: null });
    expect(band.score).toBeNull();
    expect(band.isVerifiedPrediction).toBe(false);
    expect(band.label).toBe(CALC_READINESS_LABEL);
    expect(band.sublabel).toContain("readiness level");
  });

  it("returns forming state below peer threshold", () => {
    const band = buildApReadinessBand({
      verifiedCount: MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - 1,
      accuracyPercent: 80,
      percentile: null,
    });
    expect(band.score).toBeNull();
    expect(band.label).toBe(CALC_READINESS_LABEL);
    expect(band.sublabel).toContain("unlock your readiness level");
  });

  it("maps accuracy to readiness level when verified enough", () => {
    const band = buildApReadinessBand({
      verifiedCount: 12,
      accuracyPercent: 88,
      percentile: 72,
    });
    expect(band.score).toBe(4);
    expect(band.isVerifiedPrediction).toBe(true);
    expect(band.label).toBe(CALC_READINESS_LABEL);
    expect(band.sublabel).toContain("88%");
    expect(band.sublabel).toContain("12 skills");
    expect(band.sublabel).toContain("Level 4/5");
  });

  it("uses plain language for low accuracy outlook", () => {
    const band = buildApReadinessBand({
      verifiedCount: 54,
      accuracyPercent: 44,
      percentile: 5,
    });
    expect(band.score).toBe(1);
    expect(band.sublabel).toBe(
      "44% on first try · 54 skills · Level 1/5 on the AP scale. Pick a weak skill and try it for the first time.",
    );
  });
});

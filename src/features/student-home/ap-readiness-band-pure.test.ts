import { describe, expect, it } from "vitest";
import { buildApReadinessBand } from "@/features/student-home/ap-readiness-band-pure";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";

describe("buildApReadinessBand", () => {
  it("returns building state with zero verified", () => {
    const band = buildApReadinessBand({ verifiedCount: 0, accuracyPercent: 0, percentile: null });
    expect(band.score).toBeNull();
    expect(band.isVerifiedPrediction).toBe(false);
    expect(band.label).toBe("AP score outlook");
    expect(band.sublabel).toContain("first answer");
  });

  it("returns forming state below peer threshold", () => {
    const band = buildApReadinessBand({
      verifiedCount: MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - 1,
      accuracyPercent: 80,
      percentile: null,
    });
    expect(band.score).toBeNull();
    expect(band.label).toBe("AP score outlook");
    expect(band.sublabel).toContain("first");
  });

  it("maps accuracy to AP score band when verified enough", () => {
    const band = buildApReadinessBand({
      verifiedCount: 12,
      accuracyPercent: 88,
      percentile: 72,
    });
    expect(band.score).toBe(4);
    expect(band.isVerifiedPrediction).toBe(true);
    expect(band.label).toContain("exam were today");
    expect(band.sublabel).toContain("88%");
    expect(band.sublabel).toContain("12 skills");
    expect(band.sublabel).toContain("4/5");
  });

  it("uses plain language for low accuracy outlook", () => {
    const band = buildApReadinessBand({
      verifiedCount: 54,
      accuracyPercent: 44,
      percentile: 5,
    });
    expect(band.score).toBe(1);
    expect(band.sublabel).toBe(
      "44% right on first try across 54 skills. Outlook 1/5. Pick a weak skill and try it for the first time.",
    );
  });
});

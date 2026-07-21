import { describe, expect, it } from "vitest";
import { buildApReadinessBand } from "@/features/student-home/ap-readiness-band-pure";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";

describe("buildApReadinessBand", () => {
  it("returns building state with zero verified", () => {
    const band = buildApReadinessBand({ verifiedCount: 0, accuracyPercent: 0, percentile: null });
    expect(band.score).toBeNull();
    expect(band.isVerifiedPrediction).toBe(false);
  });

  it("returns forming state below peer threshold", () => {
    const band = buildApReadinessBand({
      verifiedCount: MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - 1,
      accuracyPercent: 80,
      percentile: null,
    });
    expect(band.score).toBeNull();
    expect(band.label).toContain("forming");
  });

  it("maps accuracy to AP score band when verified enough", () => {
    const band = buildApReadinessBand({
      verifiedCount: 12,
      accuracyPercent: 88,
      percentile: 72,
    });
    expect(band.score).toBe(4);
    expect(band.isVerifiedPrediction).toBe(true);
  });
});

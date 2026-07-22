import { describe, expect, it } from "vitest";
import {
  buildApReadinessBand,
  VERIFIED_SKILL_PROOF_LABEL,
  VERIFIED_SKILL_TIER_CAPTION,
  VERIFIED_SKILL_TIER_SUFFIX,
} from "@/features/student-home/ap-readiness-band-pure";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";

describe("buildApReadinessBand", () => {
  it("returns building state with zero verified", () => {
    const band = buildApReadinessBand({
      verifiedCount: 0,
      accuracyPercent: 0,
      percentile: null,
      eligibleCohortSize: null,
    });
    expect(band.score).toBeNull();
    expect(band.isVerifiedPrediction).toBe(false);
    expect(band.label).toBe(VERIFIED_SKILL_PROOF_LABEL);
    expect(band.scoreCaption).toBe(VERIFIED_SKILL_TIER_CAPTION);
    expect(band.sublabel).toContain("first answer becomes proof");
  });

  it("returns forming state below peer threshold", () => {
    const band = buildApReadinessBand({
      verifiedCount: MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - 1,
      accuracyPercent: 80,
      percentile: null,
      eligibleCohortSize: null,
    });
    expect(band.score).toBeNull();
    expect(band.sublabel).toContain("unlock your proof tier");
  });

  it("maps accuracy to proof tier when verified enough", () => {
    const band = buildApReadinessBand({
      verifiedCount: 12,
      accuracyPercent: 88,
      percentile: 72,
      eligibleCohortSize: null,
    });
    expect(band.score).toBe(4);
    expect(band.isVerifiedPrediction).toBe(true);
    expect(band.scoreSuffix).toBe(VERIFIED_SKILL_TIER_SUFFIX);
    expect(band.sublabel).toBe("Keep first tries clean on what is left.");
    expect(band.sublabel).not.toContain("exam");
  });

  it("uses next action only when tier is known", () => {
    const band = buildApReadinessBand({
      verifiedCount: 54,
      accuracyPercent: 44,
      percentile: 5,
      eligibleCohortSize: null,
    });
    expect(band.score).toBe(1);
    expect(band.sublabel).toBe("Verify a weak skill you have not tried yet.");
  });
});

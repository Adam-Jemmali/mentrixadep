import { describe, expect, it } from "vitest";
import {
  buildStudentHomeVerdictHero,
  formatStudentHomeAccuracyMath,
  formatStudentHomePeerMetric,
} from "@/features/student-home/student-home-verdict-pure";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";

describe("student-home-verdict-pure", () => {
  it("shows checkable division for accuracy", () => {
    const math = formatStudentHomeAccuracyMath(54, 44);
    expect(math.correct).toBe(24);
    expect(math.headline).toBe("24 right on 54 first skills in AP Calculus AB");
    expect(math.value).toBe("24 ÷ 54 × 100 = 44%");
  });

  it("uses real cohort size instead of inventing 100 Mentrixers", () => {
    const peer = formatStudentHomePeerMetric(45, 54, 20);
    expect(peer.value).toBe("9 of 20 Mentrixers");
    expect(peer.detail).toContain("Ahead of 9 of 20 Mentrixers");
    expect(peer.detail).not.toContain("100 Mentrixers");
  });

  it("builds compact hero data from real rank stats", () => {
    const view = buildStudentHomeVerdictHero({
      verifiedCount: 54,
      accuracyPercent: 44,
      percentile: 45,
      eligibleCohortSize: 20,
    });
    expect(view.accuracyFraction).toEqual({ correct: 24, total: 54, percent: 44 });
    expect(view.peerSummary).toBe("9 of 20 Mentrixers ahead on first-try accuracy");
  });

  it("does not claim peer standing before threshold", () => {
    const view = buildStudentHomeVerdictHero({
      verifiedCount: MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - 1,
      accuracyPercent: 71,
      percentile: null,
      eligibleCohortSize: 20,
    });
    expect(view.peerSummary).toContain("unlock peer rank");
  });

  it("handles zero verified skills", () => {
    const view = buildStudentHomeVerdictHero({
      verifiedCount: 0,
      accuracyPercent: 0,
      percentile: null,
      eligibleCohortSize: null,
    });
    expect(view.accuracyFraction).toBeUndefined();
    expect(view.metrics).toHaveLength(0);
  });
});

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
    expect(math.headline).toBe("24 right on 54 first skills = 44%");
    expect(math.detail).toBe("24 ÷ 54 × 100 = 44%");
  });

  it("uses beat count instead of vague top percent alone", () => {
    const peer = formatStudentHomePeerMetric(99);
    expect(peer.value).toBe("Beat 99/100");
    expect(peer.detail).toContain("Top 1%");
  });

  it("builds peer headline from real rank stats", () => {
    const view = buildStudentHomeVerdictHero({
      verifiedCount: 54,
      accuracyPercent: 44,
      percentile: 99,
    });
    expect(view.headline).toContain("24 right on 54 first skills = 44%");
    expect(view.headline).toContain("Beat 99/100");
    expect(view.metrics).toHaveLength(2);
    expect(view.metrics[0]?.detail).toBe("24 ÷ 54 × 100 = 44%");
  });

  it("does not claim peer standing before threshold", () => {
    const view = buildStudentHomeVerdictHero({
      verifiedCount: MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - 1,
      accuracyPercent: 71,
      percentile: null,
    });
    expect(view.headline).not.toContain("Beat");
    expect(view.metrics.some((m) => m.label === "Peer standing")).toBe(true);
  });

  it("handles zero verified skills", () => {
    const view = buildStudentHomeVerdictHero({
      verifiedCount: 0,
      accuracyPercent: 0,
      percentile: null,
    });
    expect(view.metrics).toHaveLength(0);
    expect(view.headline).toContain("Try a skill once");
  });
});

import { describe, expect, it } from "vitest";
import { buildMomentumRoiSummary } from "@/features/pricing/momentum-roi-pure";

describe("buildMomentumRoiSummary", () => {
  it("shows annual savings of $219 on 12 sessions", () => {
    const roi = buildMomentumRoiSummary("annual");
    expect(roi.breakthroughTwelveTotal).toContain("468");
    expect(roi.momentumTwelveTotal).toContain("249");
    expect(roi.savings).toContain("219");
    expect(roi.effectivePerSession).toContain("20.75");
    expect(roi.verdict).toContain("219");
  });

  it("shows monthly year-equivalent savings", () => {
    const roi = buildMomentumRoiSummary("monthly");
    expect(roi.breakthroughTwelveTotal).toContain("468");
    expect(roi.momentumTwelveTotal).toContain("348");
    expect(roi.savings).toContain("120");
    expect(roi.effectivePerSession).toContain("29");
  });

  it("ends with verdict and next action", () => {
    const roi = buildMomentumRoiSummary("annual");
    expect(roi.verdict.length).toBeGreaterThan(20);
    expect(roi.nextAction.length).toBeGreaterThan(10);
  });
});

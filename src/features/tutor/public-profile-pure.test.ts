import { describe, expect, it } from "vitest";
import {
  computeGuideShowUpRatePercent,
  guideImpactChipHoverCopy,
  guideImpactChipVisual,
  GUIDE_IMPACT_CHIP_CLASS,
} from "@/features/tutor/public-profile-pure";

describe("public-profile-pure", () => {
  it("maps impact chip visual tiers", () => {
    expect(guideImpactChipVisual(88, 4)).toBe("high");
    expect(guideImpactChipVisual(55, 4)).toBe("moderate");
    expect(guideImpactChipVisual(40, 2)).toBe("limited");
  });

  it("builds hover copy for students improved", () => {
    expect(guideImpactChipHoverCopy(3, "Chain rule")).toBe(
      "3 students improved on Chain rule after sessions with this Guide.",
    );
  });

  it("computes show-up rate from completed vs cancelled", () => {
    expect(computeGuideShowUpRatePercent({ completed: 9, cancelled: 1 })).toBe(90);
    expect(computeGuideShowUpRatePercent({ completed: 0, cancelled: 0 })).toBeNull();
  });

  it("exposes chip class tokens", () => {
    expect(GUIDE_IMPACT_CHIP_CLASS.high).toContain("emerald");
    expect(GUIDE_IMPACT_CHIP_CLASS.moderate).toContain("amber");
    expect(GUIDE_IMPACT_CHIP_CLASS.limited).toContain("slate");
  });
});

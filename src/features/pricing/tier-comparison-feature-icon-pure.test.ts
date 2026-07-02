import { describe, expect, it } from "vitest";
import { tierComparisonFeatureIcon } from "./tier-comparison-feature-icon-pure";

describe("tierComparisonFeatureIcon", () => {
  it("maps duels copy to duels icon", () => {
    expect(tierComparisonFeatureIcon("Duels and verified rank")).toBe("duels");
  });

  it("maps movement receipt copy before generic fallbacks", () => {
    expect(tierComparisonFeatureIcon("Weekly Movement Receipt by email")).toBe("movement-receipt");
  });
});

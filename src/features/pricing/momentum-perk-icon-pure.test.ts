import { describe, expect, it } from "vitest";
import { momentumPerkVocabIcon } from "./momentum-perk-icon-pure";

describe("momentumPerkVocabIcon", () => {
  it("maps movement receipt copy to receipt icon", () => {
    expect(
      momentumPerkVocabIcon("Weekly Movement Receipt by email with grid, retest, and credit status"),
    ).toBe("receipt");
  });

  it("falls back to momentum for unknown perk lines", () => {
    expect(momentumPerkVocabIcon("Something else entirely")).toBe("tier-momentum");
  });
});

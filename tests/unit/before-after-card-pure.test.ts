import { describe, expect, it } from "vitest";
import {
  formatProofAccuracy,
  formatProofDate,
  formatProofRankFootprint,
  PROOF_CARD_COPY,
} from "@/features/share/before-after-card-pure";

describe("before after proof card pure", () => {
  it("formats accuracy and rank footprint", () => {
    expect(formatProofAccuracy(41.6)).toBe("42%");
    expect(formatProofRankFootprint("ada")).toBe("mentrixa.one/rank/ada");
    expect(formatProofRankFootprint(null)).toBeNull();
  });

  it("uses brief labels", () => {
    expect(PROOF_CARD_COPY.beforeLabel).toBe("Before");
    expect(PROOF_CARD_COPY.afterLabel).toBe("After");
    expect(PROOF_CARD_COPY.withGuide("Alex")).toBe("with Alex");
  });

  it("formats proof dates without hyphens", () => {
    const label = formatProofDate(new Date("2026-07-21T12:00:00.000Z"));
    expect(label).not.toContain("-");
    expect(label).toMatch(/2026/);
  });
});

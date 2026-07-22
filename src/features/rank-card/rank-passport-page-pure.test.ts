import { describe, expect, it } from "vitest";
import {
  formatBreakthroughReceiptLine,
  rankPassportAccuracyHeadline,
  rankPassportBandCaption,
  rankPassportBandFootnote,
  rankPassportPeerValue,
} from "@/features/rank-card/rank-passport-page-pure";

describe("rank passport page copy", () => {
  it("formats band caption and footnote", () => {
    expect(rankPassportBandCaption(4)).toBe("Proof tier 4 on AP Calculus AB");
    expect(rankPassportBandCaption(null)).toContain("Building proof");
    expect(rankPassportBandFootnote()).toBe("First attempt only");
  });

  it("formats accuracy headline", () => {
    expect(rankPassportAccuracyHeadline(71, 1)).toBe("71% first try Top 1%");
    expect(rankPassportAccuracyHeadline(71, null)).toBe("71% first try");
  });

  it("formats peer value", () => {
    expect(rankPassportPeerValue({ kind: "ranked", topPercent: 1 }, 99)).toBe("1%");
  });

  it("formats breakthrough receipt without separators", () => {
    expect(
      formatBreakthroughReceiptLine({
        nodeName: "Chain rule",
        beforeState: "weak",
        afterState: "verified",
        date: "Jul 1",
        prePercent: 40,
        postPercent: 88,
      }),
    ).toBe("Chain rule 40% to 88% Jul 1");
  });
});

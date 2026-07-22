import { describe, expect, it } from "vitest";
import { copySegments, formatFirstTryAccuracyFormula, formatXpCompactK, formatXpWatermarkK } from "@/shared/core/copy-format";

describe("formatFirstTryAccuracyFormula", () => {
  it("formats checkable accuracy math", () => {
    expect(formatFirstTryAccuracyFormula(24, 54, 44)).toBe("24 ÷ 54 × 100 = 44%");
  });
});

describe("formatXpCompactK", () => {
  it("formats thousands with K suffix", () => {
    expect(formatXpCompactK(4482)).toBe("4.5K");
    expect(formatXpCompactK(1000)).toBe("1K");
    expect(formatXpCompactK(999)).toBe("999");
  });
});

describe("formatXpWatermarkK", () => {
  it("formats background watermark with k suffix", () => {
    expect(formatXpWatermarkK(4482)).toBe("4k");
    expect(formatXpWatermarkK(1000)).toBe("1k");
    expect(formatXpWatermarkK(999)).toBe("1k");
  });
});

describe("copySegments", () => {
  it("joins with periods not middots", () => {
    expect(copySegments("44% on first try", "54 skills", "Level 1/5")).toBe(
      "44% on first try. 54 skills. Level 1/5",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  accuracyToPercentileBucket,
  buildComparisonSentence,
  computeBetterThanPercent,
  MIN_PEER_COMPARISON_SAMPLE,
} from "@/features/comparison/comparison-context-pure";

describe("accuracyToPercentileBucket", () => {
  it("maps accuracy into ten-point buckets capped at 90", () => {
    expect(accuracyToPercentileBucket(0)).toBe(0);
    expect(accuracyToPercentileBucket(9)).toBe(0);
    expect(accuracyToPercentileBucket(42)).toBe(40);
    expect(accuracyToPercentileBucket(100)).toBe(90);
  });
});

describe("computeBetterThanPercent", () => {
  it("returns null when sample size is below threshold", () => {
    const result = computeBetterThanPercent(
      100,
      [
        { accuracyBucket: 0, userCount: 4 },
        { accuracyBucket: 90, userCount: 5 },
      ],
      MIN_PEER_COMPARISON_SAMPLE,
    );
    expect(result).toBeNull();
  });

  it("counts users in lower buckets only", () => {
    const result = computeBetterThanPercent(100, [
      { accuracyBucket: 0, userCount: 30 },
      { accuracyBucket: 90, userCount: 70 },
    ]);
    expect(result).toBe(30);
  });
});

describe("buildComparisonSentence", () => {
  it("formats student and guide copy", () => {
    expect(buildComparisonSentence(64, "student")).toBe(
      "Better than 64% of everyone verified on this node.",
    );
    expect(buildComparisonSentence(64, "guide")).toBe(
      "Better than 64% of Guides teaching this node.",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  averageAccuracy,
  buildBreakthroughSharePath,
  buildBreakthroughShareTweet,
  shouldDetectBreakthrough,
} from "@/features/breakthrough-events/detect-pure";

describe("breakthrough detection", () => {
  it("requires minimum sample sizes", () => {
    expect(shouldDetectBreakthrough([80, 85], [40, 45, 50])).toBe(false);
    expect(shouldDetectBreakthrough([80, 85, 90, 88, 92], [40, 45])).toBe(false);
  });

  it("detects 25+ point jump from struggling baseline", () => {
    expect(shouldDetectBreakthrough([80, 85, 90, 88, 92], [40, 45, 50, 48, 52])).toBe(true);
  });

  it("rejects jump when old average already strong", () => {
    expect(shouldDetectBreakthrough([95, 96, 97, 98, 99], [70, 72, 71, 73, 74])).toBe(false);
  });

  it("rejects small improvements", () => {
    expect(shouldDetectBreakthrough([55, 58, 60, 57, 59], [50, 52, 51, 53, 50])).toBe(false);
  });

  it("averages accuracies with one decimal", () => {
    expect(averageAccuracy([80, 85, 90])).toBe(85);
    expect(averageAccuracy([33, 66])).toBe(49.5);
  });

  it("builds share helpers", () => {
    expect(buildBreakthroughSharePath("abc")).toBe("/breakthrough/abc");
    expect(buildBreakthroughShareTweet({
      concept: "Derivatives",
      before: 42,
      after: 78,
      shareUrl: "https://mentrixa.one/breakthrough/x",
    })).toContain("Derivatives");
  });
});

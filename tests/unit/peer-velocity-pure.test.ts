import { describe, expect, it } from "vitest";
import {
  buildPeerVelocityLine,
  buildPeerVelocitySnapshot,
  computeMedian,
} from "@/features/comparison/peer-velocity-pure";

describe("peer-velocity-pure", () => {
  it("computes median", () => {
    expect(computeMedian([1, 3, 2])).toBe(2);
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("requires minimum cohort sample", () => {
    expect(
      buildPeerVelocitySnapshot({
        userVerifiedThisWeek: 3,
        cohortCounts: [1, 2, 0, 1],
      }),
    ).toBeNull();
  });

  it("builds cohort comparison line", () => {
    const snapshot = buildPeerVelocitySnapshot({
      userVerifiedThisWeek: 3,
      cohortCounts: [1, 2, 3, 4, 5, 6],
    });
    expect(snapshot).not.toBeNull();
    expect(buildPeerVelocityLine(snapshot!)).toBe(
      "You verified 3 nodes this week; active cohort averaged 3.5.",
    );
  });
});

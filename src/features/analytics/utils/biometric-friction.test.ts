import { describe, expect, it } from "vitest";
import {
  computeCognitiveFrictionScore,
  computeKeystrokeFlightVariance,
  formatSessionFocusSignal,
  isFrictionAnomaly,
} from "@/features/analytics/utils/biometric-friction";

describe("computeKeystrokeFlightVariance", () => {
  it("returns 0 for fewer than two samples", () => {
    expect(computeKeystrokeFlightVariance([])).toBe(0);
    expect(computeKeystrokeFlightVariance([100])).toBe(0);
  });

  it("returns low variance for near-identical flight times", () => {
    expect(computeKeystrokeFlightVariance([100, 100, 101, 100])).toBeLessThan(1.5);
  });
});

describe("computeCognitiveFrictionScore", () => {
  it("defaults to 1.0 with normal signals", () => {
    expect(computeCognitiveFrictionScore(0, 50, 5)).toBe(1);
  });

  it("reduces score for tab leaks and robotic keystrokes", () => {
    expect(computeCognitiveFrictionScore(4, 0.5, 12)).toBe(0.5);
  });

  it("never drops below the 0.1 floor", () => {
    expect(computeCognitiveFrictionScore(4, 0.5, 12)).toBeGreaterThanOrEqual(0.1);
  });
});

describe("isFrictionAnomaly", () => {
  it("flags scores below 0.6", () => {
    expect(isFrictionAnomaly(0.59)).toBe(true);
    expect(isFrictionAnomaly(0.6)).toBe(false);
  });
});

describe("formatSessionFocusSignal", () => {
  it("formats guide context line", () => {
    expect(formatSessionFocusSignal(0.8)).toBe("Session focus signal: 0.8 of 1.0");
  });
});

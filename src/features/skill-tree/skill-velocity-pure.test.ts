import { describe, expect, it } from "vitest";
import {
  clampAnsweredMs,
  detectFasterVelocity,
  medianMs,
  FASTER_MIN_SAMPLES,
  FASTER_DROP_RATIO,
} from "@/features/skill-tree/skill-velocity-pure";

describe("skill velocity pure", () => {
  it("clamps answeredMs to 0..30min and drops nulls", () => {
    expect(clampAnsweredMs(null)).toBeNull();
    expect(clampAnsweredMs(undefined)).toBeNull();
    expect(clampAnsweredMs(-5)).toBeNull();
    expect(clampAnsweredMs(0)).toBeNull();
    expect(clampAnsweredMs(1200)).toBe(1200);
    expect(clampAnsweredMs(2_000_000)).toBe(1_800_000);
  });

  it("computes median", () => {
    expect(medianMs([100, 200, 300])).toBe(200);
    expect(medianMs([100, 200, 300, 400])).toBe(250);
  });

  it("requires prior samples before Faster", () => {
    expect(
      detectFasterVelocity({
        priorMs: Array(FASTER_MIN_SAMPLES - 1).fill(10_000),
        recentMs: [5_000],
      }),
    ).toBe(false);
  });

  it("detects ≥30% median drop", () => {
    expect(
      detectFasterVelocity({
        priorMs: Array(FASTER_MIN_SAMPLES).fill(10_000),
        recentMs: [7_000],
      }),
    ).toBe(true);
    expect(
      detectFasterVelocity({
        priorMs: Array(FASTER_MIN_SAMPLES).fill(10_000),
        recentMs: [8_000],
      }),
    ).toBe(false);
    expect(FASTER_DROP_RATIO).toBe(0.7);
  });
});

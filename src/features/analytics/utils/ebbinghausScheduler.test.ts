import { describe, expect, it } from "vitest";
import {
  calculateHoursToTargetReview,
  calculateMemoryStrengthBase,
  calculateNextReviewAt,
  calculateRetention,
  DEFAULT_COGNITIVE_FRICTION,
  MEMORY_STRENGTH_BASE_START,
} from "@/features/analytics/utils/ebbinghausScheduler";

describe("calculateRetention", () => {
  it("returns 1.0 at zero elapsed hours", () => {
    expect(
      calculateRetention({
        baseStrength: 24,
        hoursElapsed: 0,
        cognitiveFriction: 1,
      })
    ).toBe(1);
  });

  it("decays as hours increase", () => {
    const early = calculateRetention({
      baseStrength: 24,
      hoursElapsed: 12,
      cognitiveFriction: 1,
    });
    const late = calculateRetention({
      baseStrength: 24,
      hoursElapsed: 48,
      cognitiveFriction: 1,
    });
    expect(early).toBeGreaterThan(late);
  });

  it("clamps friction to 0.1 minimum", () => {
    const low = calculateRetention({
      baseStrength: 24,
      hoursElapsed: 24,
      cognitiveFriction: 0.01,
    });
    const clamped = calculateRetention({
      baseStrength: 24,
      hoursElapsed: 24,
      cognitiveFriction: 0.1,
    });
    expect(low).toBe(clamped);
  });
});

describe("calculateHoursToTargetReview", () => {
  it("uses default friction of 1.0 at threshold 0.60", () => {
    const hours = calculateHoursToTargetReview(MEMORY_STRENGTH_BASE_START, DEFAULT_COGNITIVE_FRICTION);
    expect(hours).toBeCloseTo(12.26, 2);
  });

  it("extends interval as memory strength grows", () => {
    const first = calculateHoursToTargetReview(24, 1);
    const second = calculateHoursToTargetReview(36, 1);
    expect(second).toBeGreaterThan(first);
  });
});

describe("calculateMemoryStrengthBase", () => {
  it("starts at 24 and gains 12 per correct", () => {
    expect(calculateMemoryStrengthBase(0)).toBe(24);
    expect(calculateMemoryStrengthBase(1)).toBe(24);
    expect(calculateMemoryStrengthBase(2)).toBe(36);
    expect(calculateMemoryStrengthBase(3)).toBe(48);
  });
});

describe("calculateNextReviewAt", () => {
  it("returns an ISO timestamp in the future", () => {
    const from = new Date("2026-06-17T12:00:00.000Z");
    const next = calculateNextReviewAt(24, 1, from);
    expect(new Date(next).getTime()).toBeGreaterThan(from.getTime());
  });
});

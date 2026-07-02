import { describe, expect, it } from "vitest";
import { utcQuarterKey, buildAlumniMomentumVerdict } from "@/features/entitlements/alumni-momentum-pure";

describe("alumni-momentum-pure", () => {
  it("formats UTC quarter keys", () => {
    expect(utcQuarterKey(new Date("2026-05-15T00:00:00.000Z"))).toBe("2026-Q2");
  });

  it("ends with verdict and next action", () => {
    const copy = buildAlumniMomentumVerdict();
    expect(copy.verdict).toContain("Alumni Momentum");
    expect(copy.nextAction.length).toBeGreaterThan(10);
  });
});

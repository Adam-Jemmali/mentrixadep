import { describe, expect, it } from "vitest";
import {
  buildLoopSlaGrantCopy,
  isFailedCoachingLoop,
  isLoopSlaEligible,
  loopSlaGrantIdempotencyKey,
} from "@/features/entitlements/loop-sla-pure";

describe("loop-sla-pure", () => {
  it("detects failed coaching loops", () => {
    expect(isFailedCoachingLoop(0.4, 0.35)).toBe(true);
    expect(isFailedCoachingLoop(0.4, 0.5)).toBe(false);
  });

  it("requires 7 days after retest completion", () => {
    const completedAt = new Date("2026-06-20T12:00:00.000Z").toISOString();
    expect(isLoopSlaEligible(completedAt, new Date("2026-06-26T12:00:00.000Z"))).toBe(false);
    expect(isLoopSlaEligible(completedAt, new Date("2026-06-28T12:00:00.000Z"))).toBe(true);
  });

  it("builds idempotent grant key", () => {
    expect(loopSlaGrantIdempotencyKey("retest-1")).toBe("loop_sla_grant:retest-1");
  });

  it("acceptance: failed loop copy restores credit", () => {
    const copy = buildLoopSlaGrantCopy({ firstName: "Alex", nodeName: "Chain rule" });
    expect(copy.verdict).toContain("restored");
    expect(copy.nextAction).toContain("make-good");
  });
});

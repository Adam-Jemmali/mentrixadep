import { describe, expect, it } from "vitest";
import {
  applyPhoenixSlumpOutcome,
  detectPhoenixRecovery,
  phoenixAwardKey,
  PHOENIX_SLUMP_MIN_INCORRECT,
} from "@/features/skill-tree/skill-phoenix-pure";

describe("skill phoenix pure", () => {
  it("marks slump after five consecutive misses", () => {
    let state = applyPhoenixSlumpOutcome(
      { consecutiveIncorrect: 0, slumpPending: false },
      false,
    );
    for (let i = 1; i < PHOENIX_SLUMP_MIN_INCORRECT - 1; i++) {
      state = applyPhoenixSlumpOutcome(state, false);
      expect(state.slumpPending).toBe(false);
    }
    state = applyPhoenixSlumpOutcome(state, false);
    expect(state.slumpPending).toBe(true);
  });

  it("recovers when solid after slump", () => {
    expect(
      detectPhoenixRecovery({
        priorState: "weak",
        nextState: "proficient",
        slumpPending: true,
      }),
    ).toBe(true);
    expect(
      detectPhoenixRecovery({
        priorState: "proficient",
        nextState: "verified",
        slumpPending: true,
      }),
    ).toBe(false);
  });

  it("builds idempotent award key by day", () => {
    const key = phoenixAwardKey(
      "user-1",
      "node-1",
      new Date("2026-07-18T15:00:00.000Z"),
    );
    expect(key).toBe("phoenix_recovery:user-1:node-1:2026-07-18");
  });
});

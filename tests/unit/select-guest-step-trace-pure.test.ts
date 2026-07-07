import { describe, expect, it } from "vitest";
import {
  deterministicPickIndex,
  guestStepTracePickTier,
  pickDeterministicByTier,
} from "@/features/diagnostics/select-guest-step-trace-pure";

describe("select-guest-step-trace-pure", () => {
  it("prioritizes unit 1–3 chain and limit nodes", () => {
    expect(
      guestStepTracePickTier({ unitNumber: 3, nodeSlug: "chain-rule-basics" }),
    ).toBe(1);
    expect(
      guestStepTracePickTier({ unitNumber: 1, nodeSlug: "limit-laws-and-algebraic-limits" }),
    ).toBe(1);
    expect(guestStepTracePickTier({ unitNumber: 2, nodeSlug: "power-rule" })).toBe(2);
    expect(guestStepTracePickTier({ unitNumber: 5, nodeSlug: "chain-rule-basics" })).toBe(3);
  });

  it("picks deterministically from the same seed", () => {
    const items = [
      { unitNumber: 3, nodeSlug: "chain-rule-basics", id: "a" },
      { unitNumber: 3, nodeSlug: "chain-rule-with-composite-functions", id: "b" },
      { unitNumber: 1, nodeSlug: "limit-laws-and-algebraic-limits", id: "c" },
    ];
    const first = pickDeterministicByTier(items, "session-abc");
    const second = pickDeterministicByTier(items, "session-abc");
    expect(first?.id).toBe(second?.id);
  });

  it("changes pick when the session seed changes", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      unitNumber: 3,
      nodeSlug: "chain-rule-basics",
      id: `item-${i}`,
    }));
    const picks = new Set(
      ["seed-1", "seed-2", "seed-3", "seed-4", "seed-5"].map(
        (seed) => pickDeterministicByTier(items, seed)?.id,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("maps hash to a stable index", () => {
    expect(deterministicPickIndex("stable-seed", 4)).toBe(
      deterministicPickIndex("stable-seed", 4),
    );
  });
});

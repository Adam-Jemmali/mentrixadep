import { describe, expect, it } from "vitest";
import {
  buildGuideMemoryBlock,
  isGuideMemoryWindowOpen,
} from "@/features/guide-memory/guide-memory-pure";

describe("guide-memory-pure", () => {
  it("opens 24h before session", () => {
    const start = "2026-07-10T15:00:00.000Z";
    expect(isGuideMemoryWindowOpen(start, new Date("2026-07-09T14:00:00.000Z").getTime())).toBe(false);
    expect(isGuideMemoryWindowOpen(start, new Date("2026-07-09T15:00:00.000Z").getTime())).toBe(true);
  });

  it("builds verdict and next action", () => {
    const block = buildGuideMemoryBlock({
      guideName: "Jordan",
      verifiedNodesGained: ["Limits"],
      retestsPassed: 1,
      retestsFailed: 0,
      weakestOpenNode: "Chain rule",
      lastImpactNodeName: "Limits",
      lastImpactDelta: 0.2,
    });
    expect(block.verdict).toContain("Jordan");
    expect(block.nextAction).toContain("Chain rule");
  });
});

import { describe, expect, it } from "vitest";
import { buildMonthlyMovementRollup } from "@/features/movement-receipt/movement-receipt-monthly-rollup-pure";
import type { MovementReceiptData } from "@/features/movement-receipt/types";

const baseReceipt = (overrides: Partial<MovementReceiptData> = {}): MovementReceiptData => ({
  firstName: "Alex",
  weekStart: "2026-06-30",
  momentumActive: true,
  grid: {
    newlyVerifiedCount: 1,
    flippedToWeakCount: 0,
    verifiedTotalCount: 10,
    priorWeekNewlyVerified: 0,
  },
  loops: {
    completedThisWeek: 1,
    latestClosedNodeName: "Limits",
    latestPreAccuracy: 0.4,
    latestPostAccuracy: 0.8,
  },
  retest: {
    nodeName: null,
    isDue: false,
    countdownLabel: null,
    priorityRetest: true,
  },
  credit: {
    momentumActive: true,
    creditsRemaining: 1,
    periodMonth: "2026-06-01",
  },
  peer: null,
  ...overrides,
});

describe("buildMonthlyMovementRollup", () => {
  it("aggregates verified nodes and loops across receipts", () => {
    const rollup = buildMonthlyMovementRollup({
      firstName: "Alex",
      monthLabel: "June 2026",
      receipts: [baseReceipt(), baseReceipt({ grid: { ...baseReceipt().grid, newlyVerifiedCount: 2 } })],
    });
    expect(rollup.totalNewVerified).toBe(3);
    expect(rollup.totalLoopsClosed).toBe(2);
    expect(rollup.verdict).toContain("Alex");
    expect(rollup.nextAction.length).toBeGreaterThan(10);
  });

  it("nudges when multiple weeks left unused credit", () => {
    const rollup = buildMonthlyMovementRollup({
      firstName: "Alex",
      monthLabel: "June 2026",
      receipts: [baseReceipt(), baseReceipt()],
    });
    expect(rollup.weeksWithUnusedCredit).toBe(2);
    expect(rollup.nextAction).toContain("unused");
  });
});

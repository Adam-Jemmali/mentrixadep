import { describe, expect, it } from "vitest";
import {
  buildMovementReceiptDetailLines,
  buildMovementReceiptVerdict,
  movementReceiptEmailSubject,
} from "@/features/movement-receipt/movement-receipt-pure";
import type { MovementReceiptData } from "@/features/movement-receipt/types";

const baseReceipt: MovementReceiptData = {
  firstName: "Alex",
  weekStart: "2026-06-30",
  momentumActive: true,
  grid: {
    newlyVerifiedCount: 0,
    flippedToWeakCount: 0,
    verifiedTotalCount: 12,
    priorWeekNewlyVerified: 1,
  },
  loops: {
    completedThisWeek: 0,
    latestClosedNodeName: null,
    latestPreAccuracy: null,
    latestPostAccuracy: null,
  },
  retest: {
    nodeName: null,
    isDue: false,
    countdownLabel: null,
    priorityRetest: false,
  },
  credit: {
    momentumActive: true,
    creditsRemaining: 0,
    monthlyCreditsRemaining: 0,
    periodMonth: "2026-07-01",
  },
};

describe("buildMovementReceiptVerdict", () => {
  it("prioritizes due retest", () => {
    const { verdict, nextAction } = buildMovementReceiptVerdict({
      ...baseReceipt,
      grid: { ...baseReceipt.grid, newlyVerifiedCount: 2 },
      retest: {
        nodeName: "Chain Rule",
        isDue: true,
        countdownLabel: "Due now",
        priorityRetest: true,
      },
    });
    expect(verdict).toContain("Retest due on Chain Rule");
    expect(verdict).toContain("2 new verified");
    expect(nextAction).toContain("retest");
  });

  it("surfaces unused session credit for Momentum", () => {
    const { verdict, nextAction, ctaHref } = buildMovementReceiptVerdict({
      ...baseReceipt,
      credit: { momentumActive: true, creditsRemaining: 1, monthlyCreditsRemaining: 1, periodMonth: "2026-07-01" },
    });
    expect(verdict).toContain("included session credit is unused");
    expect(nextAction).toContain("Book your included Guide session");
    expect(ctaHref).toBe("/student/guides");
  });

  it("prioritizes sprint pack credits in verdict", () => {
    const { verdict, nextAction, ctaHref } = buildMovementReceiptVerdict({
      ...baseReceipt,
      credit: {
        momentumActive: true,
        creditsRemaining: 3,
        monthlyCreditsRemaining: 0,
        periodMonth: "2026-07-01",
      },
      packSprint: {
        creditsRemaining: 2,
        creditsGranted: 3,
        daysRemaining: 41,
      },
    });
    expect(verdict).toContain("Sprint: 2 of 3 remaining, 41 days left");
    expect(nextAction).toContain("sprint session");
    expect(ctaHref).toBe("/student/guides");
  });

  it("celebrates grid movement with pace", () => {
    const { verdict } = buildMovementReceiptVerdict({
      ...baseReceipt,
      grid: {
        newlyVerifiedCount: 3,
        flippedToWeakCount: 0,
        verifiedTotalCount: 15,
        priorWeekNewlyVerified: 1,
      },
    });
    expect(verdict).toContain("3 new verified nodes");
    expect(verdict).toContain("Up from 1 last week");
  });

  it("upsells Momentum on stall for free users", () => {
    const { nextAction } = buildMovementReceiptVerdict({
      ...baseReceipt,
      momentumActive: false,
      credit: { momentumActive: false, creditsRemaining: 0, monthlyCreditsRemaining: 0, periodMonth: null },
    });
    expect(nextAction).toContain("Upgrade for weekly email");
  });

  it("weaves peer velocity into verdict for Momentum", () => {
    const { verdict } = buildMovementReceiptVerdict({
      ...baseReceipt,
      grid: { ...baseReceipt.grid, newlyVerifiedCount: 3 },
      peer: { userVerifiedThisWeek: 3, cohortMedian: 1.2, sampleSize: 12 },
    });
    expect(verdict).toContain("active cohort averaged 1.2");
  });
});

describe("buildMovementReceiptDetailLines", () => {
  it("includes grid, credit, and retest lines for Momentum", () => {
    const lines = buildMovementReceiptDetailLines({
      ...baseReceipt,
      grid: { ...baseReceipt.grid, newlyVerifiedCount: 2 },
      credit: { momentumActive: true, creditsRemaining: 1, monthlyCreditsRemaining: 1, periodMonth: "2026-07-01" },
      retest: {
        nodeName: "Limits",
        isDue: false,
        countdownLabel: "18h",
        priorityRetest: true,
      },
      loops: { ...baseReceipt.loops, completedThisWeek: 1 },
      peer: { userVerifiedThisWeek: 2, cohortMedian: 1, sampleSize: 10 },
    });
    expect(lines.some((l) => l.startsWith("Grid:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Loops:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Credit:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Retest:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Cohort:"))).toBe(true);
  });
});

describe("movementReceiptEmailSubject", () => {
  it("uses verified count when movement happened", () => {
    expect(
      movementReceiptEmailSubject({
        ...baseReceipt,
        grid: { ...baseReceipt.grid, newlyVerifiedCount: 2 },
      }),
    ).toBe("Alex — 2 new verified nodes this week");
  });
});

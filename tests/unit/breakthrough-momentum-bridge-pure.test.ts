import { describe, expect, it } from "vitest";
import {
  buildBreakthroughMomentumBridgeMessages,
  nextCreditMonthLabel,
} from "@/features/payments/breakthrough-momentum-bridge-pure";

describe("buildBreakthroughMomentumBridgeMessages", () => {
  it("returns null for Momentum subscribers", () => {
    expect(
      buildBreakthroughMomentumBridgeMessages({
        momentumActive: true,
        courseName: "AP Calculus AB",
      }),
    ).toBeNull();
  });

  it("surfaces factual counterfactual for free users", () => {
    const messages = buildBreakthroughMomentumBridgeMessages({
      momentumActive: false,
      courseName: "AP Calculus AB",
      now: new Date("2026-07-15T12:00:00.000Z"),
    });
    expect(messages?.verdict).toContain("24h not 48h");
    expect(messages?.verdict).toContain("Movement Receipts");
    expect(messages?.nextAction).toContain("Upgrade to Momentum");
  });
});

describe("nextCreditMonthLabel", () => {
  it("returns first day of next month", () => {
    const label = nextCreditMonthLabel(new Date("2026-07-15T12:00:00.000Z"));
    expect(label).toContain("August");
  });
});

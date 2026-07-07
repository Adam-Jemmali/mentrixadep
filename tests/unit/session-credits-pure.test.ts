import { describe, expect, it } from "vitest";
import {
  momentumCreditRedemptionKey,
  pickMonthlySessionCreditForConsume,
  summarizeMonthlySessionCredits,
  utcPeriodMonthKey,
} from "@/features/entitlements/session-credits-pure";

describe("session-credits-pure", () => {
  it("uses the first UTC day of the month", () => {
    expect(utcPeriodMonthKey(new Date("2026-07-15T12:00:00.000Z"))).toBe("2026-07-01");
    expect(utcPeriodMonthKey(new Date("2026-01-31T23:59:59.000Z"))).toBe("2026-01-01");
  });

  it("builds stable redemption idempotency keys", () => {
    expect(momentumCreditRedemptionKey("user-a", "slot-b")).toBe("redeem:user-a:slot-b");
  });

  it("sums monthly credits across grant sources for the same period", () => {
    const summary = summarizeMonthlySessionCredits([
      { id: "a", period_month: "2026-07-01", credits_remaining: 0 },
      { id: "b", period_month: "2026-07-01", credits_remaining: 1 },
    ]);
    expect(summary.totalRemaining).toBe(1);
    expect(summary.representative?.id).toBe("b");
  });

  it("picks the soonest-expiring monthly row for consumption", () => {
    const picked = pickMonthlySessionCreditForConsume([
      { id: "july", period_month: "2026-07-01", credits_remaining: 1 },
      { id: "june", period_month: "2026-06-01", credits_remaining: 1 },
    ]);
    expect(picked?.id).toBe("june");
  });
});

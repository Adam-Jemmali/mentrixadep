import { describe, expect, it } from "vitest";
import {
  momentumCreditRedemptionKey,
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
});

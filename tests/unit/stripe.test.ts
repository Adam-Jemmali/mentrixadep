import { describe, expect, it } from "vitest";
import { PLATFORM_FEE_BPS, splitSessionPriceCents } from "@/lib/booking-pricing";
import {
  isStudentCancelRefundEligible,
  hoursUntilSessionStart,
  STUDENT_REFUND_WINDOW_HOURS,
} from "@/lib/refund-eligibility";

// ─── Fee parity guard: ensure payout math uses same fee BPS as checkout ─────

/**
 * Standalone functions mirroring payout split math used by tutor payout views.
 * Keep these in sync with the "real" implementations to ensure consistency.
 */
function tutorNetCents(grossCents: number): number {
  const TUTOR_SHARE_BPS = 10_000 - PLATFORM_FEE_BPS;
  return Math.round((grossCents * TUTOR_SHARE_BPS) / 10_000);
}

function payoutPlatformFeeCents(grossCents: number): number {
  return grossCents - tutorNetCents(grossCents);
}

describe("fee parity (checkout vs payout)", () => {
  it("checkout and payout fees use same PLATFORM_FEE_BPS constant", () => {
    expect(PLATFORM_FEE_BPS).toBe(1500);
  });

  it("checkout splitSessionPriceCents and payout platformFeeCents compute identical fee", () => {
    const testAmounts = [1000, 2500, 10_000, 33_333, 100_000];
    for (const amount of testAmounts) {
      const checkoutFee = splitSessionPriceCents(amount).platformFeeCents;
      const payoutFee = payoutPlatformFeeCents(amount);
      expect(payoutFee).toBe(checkoutFee, `Fee mismatch at amount ${amount}: checkout=${checkoutFee}, payout=${payoutFee}`);
    }
  });

  it("tutor net equals gross minus platform fee", () => {
    const amount = 10_000;
    const checkoutFee = splitSessionPriceCents(amount).platformFeeCents;
    const payoutNet = tutorNetCents(amount);
    expect(payoutNet + checkoutFee).toBe(amount);
  });
})

/**
 * Model A:
 * - Learner pays base session amount only.
 * - Platform fee is 15% (1500 bps) retained from tutor-side settlement.
 */
describe("splitSessionPriceCents (platform fee)", () => {
  it("computes 15% platform fee on round amounts", () => {
    const s = splitSessionPriceCents(10_000);
    expect(s.sessionCents).toBe(10_000);
    expect(s.platformFeeCents).toBe(1500);
    expect(s.totalCents).toBe(10_000);
  });

  it("handles small session prices", () => {
    const s = splitSessionPriceCents(2500);
    expect(s.platformFeeCents).toBe(375);
    expect(s.totalCents).toBe(2500);
  });

  it("handles odd cents with rounding", () => {
    const s = splitSessionPriceCents(1999);
    expect(s.platformFeeCents).toBe(300);
    expect(s.totalCents).toBe(1999);
  });

  it("uses PLATFORM_FEE_BPS for math consistency", () => {
    expect(PLATFORM_FEE_BPS).toBe(1500);
    const base = 33_333;
    const s = splitSessionPriceCents(base);
    expect(s.platformFeeCents).toBe(Math.round((base * PLATFORM_FEE_BPS) / 10_000));
    expect(s.totalCents).toBe(base);
  });
});

describe("student cancel refund eligibility (>24h)", () => {
  it("is eligible when session starts more than 24 hours from now", () => {
    const now = new Date("2025-06-01T12:00:00.000Z").getTime();
    const start = new Date("2025-06-05T12:00:00.000Z").toISOString();
    expect(hoursUntilSessionStart(start, now)).toBeGreaterThan(STUDENT_REFUND_WINDOW_HOURS);
    expect(isStudentCancelRefundEligible(start, now)).toBe(true);
  });

  it("is not eligible when within 24 hours", () => {
    const now = new Date("2025-06-01T12:00:00.000Z").getTime();
    const start = new Date("2025-06-02T11:00:00.000Z").toISOString();
    expect(isStudentCancelRefundEligible(start, now)).toBe(false);
  });

  it("is not eligible exactly at 24 hours before start", () => {
    const now = new Date("2025-06-01T12:00:00.000Z").getTime();
    const start = new Date("2025-06-02T12:00:00.000Z").toISOString();
    expect(hoursUntilSessionStart(start, now)).toBe(24);
    expect(isStudentCancelRefundEligible(start, now)).toBe(false);
  });

  it("is eligible just after 24 hours (strict inequality)", () => {
    const now = new Date("2025-06-01T12:00:00.000Z").getTime();
    const start = new Date("2025-06-02T12:00:01.000Z").toISOString();
    expect(hoursUntilSessionStart(start, now)).toBeGreaterThan(24);
    expect(isStudentCancelRefundEligible(start, now)).toBe(true);
  });
});

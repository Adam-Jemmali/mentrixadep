import { describe, expect, it } from "vitest";
import { PLATFORM_FEE_BPS, splitSessionPriceCents } from "@/lib/booking-pricing";
import {
  isStudentCancelRefundEligible,
  hoursUntilSessionStart,
  STUDENT_REFUND_WINDOW_HOURS,
} from "@/lib/refund-eligibility";

/**
 * Platform fee is 5% (500 bps) of the Guide price — see `PLATFORM_FEE_BPS`.
 * (Some product docs mention 15%; the billing implementation is 5%.)
 */
describe("splitSessionPriceCents (platform fee)", () => {
  it("charges 5% platform fee on round amounts", () => {
    const s = splitSessionPriceCents(10_000);
    expect(s.sessionCents).toBe(10_000);
    expect(s.platformFeeCents).toBe(500);
    expect(s.totalCents).toBe(10_500);
  });

  it("handles small session prices", () => {
    const s = splitSessionPriceCents(2500);
    expect(s.platformFeeCents).toBe(125);
    expect(s.totalCents).toBe(2625);
  });

  it("handles odd cents with rounding", () => {
    const s = splitSessionPriceCents(1999);
    expect(s.platformFeeCents).toBe(100);
    expect(s.totalCents).toBe(2099);
  });

  it("uses PLATFORM_FEE_BPS for math consistency", () => {
    expect(PLATFORM_FEE_BPS).toBe(500);
    const base = 33_333;
    const s = splitSessionPriceCents(base);
    expect(s.platformFeeCents).toBe(Math.round((base * PLATFORM_FEE_BPS) / 10_000));
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

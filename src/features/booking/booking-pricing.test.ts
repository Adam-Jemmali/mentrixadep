import { describe, expect, it } from "vitest";
import {
  BREAKTHROUGH_SESSION_PRICE_CENTS,
  MOMENTUM_PACK_PRICE_CENTS,
  getStudentSessionCheckoutCents,
  splitSessionPriceCents,
} from "@/features/booking/booking-pricing";

describe("splitSessionPriceCents", () => {
  it("computes 15% platform fee while charging learner base amount only", () => {
    const s = splitSessionPriceCents(2500);
    expect(s.sessionCents).toBe(2500);
    expect(s.platformFeeCents).toBe(375);
    expect(s.totalCents).toBe(2500);
  });

  it("rounds 15% fee to nearest cent", () => {
    const s = splitSessionPriceCents(1999);
    expect(s.platformFeeCents).toBe(300);
    expect(s.totalCents).toBe(1999);
  });
});

describe("flat student pricing", () => {
  it("charges $39 CAD per breakthrough session", () => {
    expect(BREAKTHROUGH_SESSION_PRICE_CENTS).toBe(3900);
    expect(getStudentSessionCheckoutCents()).toBe(3900);
    const split = splitSessionPriceCents(getStudentSessionCheckoutCents());
    expect(split.totalCents).toBe(3900);
    expect(split.platformFeeCents).toBe(585);
  });

  it("momentum pack is $99 for three sessions", () => {
    expect(MOMENTUM_PACK_PRICE_CENTS).toBe(9900);
    expect(MOMENTUM_PACK_PRICE_CENTS).toBe(BREAKTHROUGH_SESSION_PRICE_CENTS * 3 - 1800);
  });
});

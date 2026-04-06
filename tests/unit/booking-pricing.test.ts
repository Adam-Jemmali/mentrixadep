import { describe, expect, it } from "vitest";
import { splitSessionPriceCents } from "@/lib/booking-pricing";

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

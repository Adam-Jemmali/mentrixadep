import { describe, expect, it } from "vitest";
import { splitSessionPriceCents } from "@/lib/booking-pricing";

describe("splitSessionPriceCents", () => {
  it("adds 5% platform fee and totals", () => {
    const s = splitSessionPriceCents(2500);
    expect(s.sessionCents).toBe(2500);
    expect(s.platformFeeCents).toBe(125);
    expect(s.totalCents).toBe(2625);
  });

  it("rounds fee to nearest cent", () => {
    const s = splitSessionPriceCents(1999);
    expect(s.platformFeeCents).toBe(100);
    expect(s.totalCents).toBe(2099);
  });
});

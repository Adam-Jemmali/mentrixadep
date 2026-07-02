import { describe, expect, it } from "vitest";
import {
  buildPricingTiers,
  FREE_TIER_PAYWALL_COMMITMENT,
  PRICING_SECTION_HEADLINE,
} from "@/features/pricing/pricing-tiers-pure";
import { BREAKTHROUGH_SESSION_PRICE_CENTS } from "@/features/booking/booking-pricing";

describe("pricing tiers copy", () => {
  it("states the free paywall commitment verbatim", () => {
    expect(FREE_TIER_PAYWALL_COMMITMENT).toBe("Nothing here ever moves behind a paywall");
    const arena = buildPricingTiers().find((tier) => tier.id === "arena");
    expect(arena?.paywallCommitment).toBe(FREE_TIER_PAYWALL_COMMITMENT);
  });

  it("lists arena free receipts without mechanic descriptions", () => {
    const arena = buildPricingTiers().find((tier) => tier.id === "arena");
    expect(arena?.receipts).toEqual([
      "Full Mastery Grid",
      "Unlimited approved item bank practice",
      "Public rank page",
      "Duels scoped to AP Calculus AB only",
    ]);
  });

  it("lists breakthrough session receipts only", () => {
    const breakthrough = buildPricingTiers().find((tier) => tier.id === "breakthrough");
    expect(breakthrough?.receipts).toHaveLength(5);
    expect(breakthrough?.receipts[0]).toBe("Session brief your Guide already has");
    expect(breakthrough?.priceMain).toContain("39");
    expect(BREAKTHROUGH_SESSION_PRICE_CENTS).toBe(3900);
  });

  it("lists momentum subscription receipts and routes to subscribe", () => {
    const momentum = buildPricingTiers().find((tier) => tier.id === "momentum");
    expect(momentum?.receipts).toEqual([
      "One included Guide session per month at $0 checkout when credit applies",
      "Member session rate $29 versus $39 pay as you go",
      "Weekly Movement Receipt by email with grid, retest, and credit status",
      "Priority retests 24h after session versus 48h free",
      "Mastery Grid timeline and full progress archive",
      "Full Loop Report with every closed coaching loop",
      "Goal pace dashboard with exam countdown",
      "Full Guide impact receipt history",
      "Early pre-session brief 24h before your call",
    ]);
    expect(momentum?.buttonLink).toBe("/student/subscribe");
    expect(momentum?.popular).toBe(true);
  });

  it("anchors the section headline on the trust commitment", () => {
    expect(PRICING_SECTION_HEADLINE).toBe("Nothing free today gets paywalled tomorrow.");
  });
});

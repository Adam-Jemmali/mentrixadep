import { describe, expect, it } from "vitest";
import {
  buildPricingTiers,
  buildTierComparisonRows,
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

  it("lists arena free receipts and explicit exclusions", () => {
    const arena = buildPricingTiers().find((tier) => tier.id === "arena");
    expect(arena?.receipts[0]).toContain("Mastery Grid");
    expect(arena?.exclusions.some((line) => line.includes("Guide sessions"))).toBe(true);
    expect(arena?.exclusions.some((line) => line.includes("Movement Receipts"))).toBe(true);
  });

  it("lists breakthrough session receipts and momentum gaps", () => {
    const breakthrough = buildPricingTiers().find((tier) => tier.id === "breakthrough");
    expect(breakthrough?.receipts).toHaveLength(5);
    expect(breakthrough?.priceMain).toContain("39");
    expect(BREAKTHROUGH_SESSION_PRICE_CENTS).toBe(3900);
    expect(breakthrough?.exclusions.some((line) => line.includes("monthly credit"))).toBe(true);
  });

  it("lists Beat Line for Arena and Momentum", () => {
    const arena = buildPricingTiers().find((tier) => tier.id === "arena");
    const momentum = buildPricingTiers().find((tier) => tier.id === "momentum");
    expect(arena?.receipts.some((line) => line.includes("Beat Line"))).toBe(true);
    expect(momentum?.receipts.some((line) => line.includes("Beat Line"))).toBe(true);
    const rows = buildTierComparisonRows();
    const beatLineRow = rows.find((row) => row.feature.includes("Beat Line"));
    expect(beatLineRow?.arena).toBe("yes");
    expect(beatLineRow?.momentum).toBe("yes");
    expect(beatLineRow?.momentumExclusive).toBeFalsy();
  });

  it("lists momentum subscription receipts and routes to subscribe", () => {
    const momentum = buildPricingTiers().find((tier) => tier.id === "momentum");
    expect(momentum?.receipts.some((line) => line.includes("Movement Receipt"))).toBe(true);
    expect(momentum?.receipts.some((line) => line.includes("Playbook"))).toBe(true);
    expect(momentum?.receipts.some((line) => line.includes("Proof Chain"))).toBe(true);
    expect(momentum?.receipts.some((line) => line.includes("Action Queue"))).toBe(true);
    expect(momentum?.receipts.length).toBeGreaterThanOrEqual(15);
    expect(momentum?.buttonLink).toBe("/student/subscribe");
    expect(momentum?.popularBadge).toBe("Only subscription");
  });

  it("includes Playbook in the comparison matrix", () => {
    const rows = buildTierComparisonRows();
    expect(rows.some((row) => row.feature.includes("Playbook"))).toBe(true);
    expect(rows.some((row) => row.feature.includes("Proof Chain"))).toBe(true);
    expect(rows.some((row) => row.feature.startsWith("Beat Line"))).toBe(true);
  });

  it("marks momentum-exclusive rows in the comparison matrix", () => {
    const exclusive = buildTierComparisonRows().filter((row) => row.momentumExclusive);
    expect(exclusive.length).toBeGreaterThan(5);
    expect(exclusive.every((row) => row.arena === "no" && row.breakthrough === "no")).toBe(true);
  });

  it("anchors the section headline on three clear tiers", () => {
    expect(PRICING_SECTION_HEADLINE).toBe("Three tiers. One proof.");
  });
});

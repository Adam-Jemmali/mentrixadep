import { describe, expect, it } from "vitest";
import { buildCheckoutPriceAnchor } from "@/features/booking/checkout-price-anchor-pure";

describe("buildCheckoutPriceAnchor", () => {
  it("highlights payg for free users", () => {
    const anchor = buildCheckoutPriceAnchor({
      momentumSubscriber: false,
      sessionCreditAvailable: false,
      useSessionCredit: false,
    });
    expect(anchor.activeTier).toBe("payg");
    expect(anchor.headline).toContain("39");
    expect(anchor.subline).toContain("219");
  });

  it("highlights credit when applied", () => {
    const anchor = buildCheckoutPriceAnchor({
      momentumSubscriber: true,
      sessionCreditAvailable: true,
      useSessionCredit: true,
    });
    expect(anchor.activeTier).toBe("credit");
    expect(anchor.headline).toContain("credit");
  });

  it("highlights member rate for subscribers without credit", () => {
    const anchor = buildCheckoutPriceAnchor({
      momentumSubscriber: true,
      sessionCreditAvailable: false,
      useSessionCredit: false,
    });
    expect(anchor.activeTier).toBe("member");
    expect(anchor.headline).toContain("29");
  });
});

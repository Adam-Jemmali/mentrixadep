import { describe, expect, it } from "vitest";
import { buildMomentumSubscriptionCheckoutParams } from "@/features/payments/student-subscription-checkout";

describe("buildMomentumSubscriptionCheckoutParams", () => {
  it("uses hosted checkout branding_settings like session booking", () => {
    const params = buildMomentumSubscriptionCheckoutParams({
      origin: "https://mentrixa.one",
      userId: "user-1",
      userEmail: "student@example.com",
      interval: "annual",
    });

    expect(params.mode).toBe("subscription");
    expect(params.payment_method_types).toEqual(["card"]);
    expect(params.branding_settings?.display_name).toBe("Mentrixa");
    expect(params.metadata?.checkout_kind).toBe("momentum_subscription");
    expect(params.metadata?.billing_interval).toBe("annual");
    expect(params.line_items?.[0]).toMatchObject({
      price_data: {
        recurring: { interval: "year" },
      },
    });
  });

  it("builds monthly recurring line items", () => {
    const params = buildMomentumSubscriptionCheckoutParams({
      origin: "https://mentrixa.one",
      userId: "user-1",
      interval: "monthly",
    });

    expect(params.metadata?.billing_interval).toBe("monthly");
    expect(params.line_items?.[0]).toMatchObject({
      price_data: {
        recurring: { interval: "month" },
      },
    });
  });
});

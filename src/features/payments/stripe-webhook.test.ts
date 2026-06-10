import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
  "charge.refunded",
  "refund.updated",
];

function readWebhookRouteSource(): string {
  const p = join(process.cwd(), "src", "features", "payments", "stripe-webhook.ts");
  return readFileSync(p, "utf8");
}

describe("stripe webhook route contract", () => {
  it("handles all required Stripe event types", () => {
    const src = readWebhookRouteSource();
    for (const ev of REQUIRED_EVENTS) {
      expect(src.includes(`case \"${ev}\"`), `Missing handler case for ${ev}`).toBe(true);
    }
  });

  it("verifies webhook signatures", () => {
    const src = readWebhookRouteSource();
    expect(src.includes("webhooks.constructEvent")).toBe(true);
    expect(src.includes("getStripeWebhookSecret")).toBe(true);
  });
});

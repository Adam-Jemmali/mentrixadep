import { describe, expect, it } from "vitest";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import {
  cancelMomentumConfirmCopy,
  cancelMomentumSuccessCopy,
  resolveMomentumCancelEligibility,
  resumeMomentumConfirmCopy,
  resumeMomentumSuccessCopy,
} from "@/features/payments/subscription-cancel-pure";

function row(overrides: Partial<StudentSubscriptionRow> = {}): StudentSubscriptionRow {
  return {
    user_id: "u1",
    stripe_customer_id: "cus_1",
    stripe_subscription_id: "sub_1",
    billing_interval: "annual",
    plan_tier: "momentum",
    local_status: "active",
    stripe_status: "active",
    current_period_end: "2026-08-01T00:00:00.000Z",
    cancel_at_period_end: false,
    mismatch_flagged_at: null,
    ...overrides,
  };
}

describe("resolveMomentumCancelEligibility", () => {
  it("allows cancel for active Stripe Momentum", () => {
    const result = resolveMomentumCancelEligibility({ subscription: row() });
    expect(result).toMatchObject({ canCancel: true, canResume: false });
  });

  it("allows resume when renewal already off", () => {
    const result = resolveMomentumCancelEligibility({
      subscription: row({ cancel_at_period_end: true }),
    });
    expect(result).toMatchObject({ canCancel: false, canResume: true });
  });

  it("blocks cancel for comp members", () => {
    const result = resolveMomentumCancelEligibility({
      subscription: row(),
      momentumCompMember: true,
    });
    expect(result).toMatchObject({ canCancel: false, canResume: false });
  });

  it("blocks cancel when inactive", () => {
    const result = resolveMomentumCancelEligibility({
      subscription: row({ local_status: "canceled" }),
    });
    expect(result).toMatchObject({ canCancel: false, canResume: false });
  });

  it("blocks cancel without stripe subscription id", () => {
    const result = resolveMomentumCancelEligibility({
      subscription: row({ stripe_subscription_id: null }),
    });
    expect(result).toMatchObject({ canCancel: false, canResume: false });
  });
});

describe("cancel and resume copy", () => {
  it("states paid period is kept and not refunded", () => {
    const copy = cancelMomentumConfirmCopy("Aug 1, 2026");
    expect(copy.description).toContain("until Aug 1, 2026");
    expect(copy.description).toContain("not refunded");
    expect(copy.confirmLabel).toBe("Turn off renewal");
  });

  it("resume copy restores billing", () => {
    const copy = resumeMomentumConfirmCopy("Aug 1, 2026");
    expect(copy.description).toContain("Aug 1, 2026");
    expect(copy.confirmLabel).toBe("Resume renewal");
  });

  it("success copy matches paid through period end", () => {
    expect(cancelMomentumSuccessCopy("Aug 1, 2026").verdict).toContain("Aug 1, 2026");
    expect(resumeMomentumSuccessCopy("Aug 1, 2026").verdict).toContain("Aug 1, 2026");
  });
});

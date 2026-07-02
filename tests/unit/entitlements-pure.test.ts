import { describe, expect, it } from "vitest";
import { buildStudentEntitlements } from "@/features/entitlements/entitlements-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";

const activeSubscription: StudentSubscriptionRow = {
  user_id: "user-1",
  stripe_customer_id: "cus_1",
  stripe_subscription_id: "sub_1",
  billing_interval: "annual",
  local_status: "active",
  stripe_status: "active",
  current_period_end: "2026-12-31T00:00:00.000Z",
  cancel_at_period_end: false,
  mismatch_flagged_at: null,
};

describe("buildStudentEntitlements", () => {
  it("always includes arena.free", () => {
    const entitlements = buildStudentEntitlements({
      userId: "user-1",
      subscription: null,
      sessionCreditsRemaining: 0,
      sessionCreditPeriodMonth: null,
    });
    expect(entitlements.entitlementIds).toEqual(["arena.free"]);
    expect(entitlements.momentumActive).toBe(false);
  });

  it("adds momentum perks when subscription is active", () => {
    const entitlements = buildStudentEntitlements({
      userId: "user-1",
      subscription: activeSubscription,
      sessionCreditsRemaining: 1,
      sessionCreditPeriodMonth: "2026-07-01",
    });
    expect(entitlements.entitlementIds).toContain("momentum.active");
    expect(entitlements.entitlementIds).toContain("momentum.priority_retest");
    expect(entitlements.entitlementIds).toContain("momentum.movement_receipt");
    expect(entitlements.entitlementIds).toContain("momentum.session_credit");
    expect(entitlements.sessionCreditsRemaining).toBe(1);
  });

  it("hides session credit when subscription is inactive even if a row exists", () => {
    const entitlements = buildStudentEntitlements({
      userId: "user-1",
      subscription: { ...activeSubscription, local_status: "canceled" },
      sessionCreditsRemaining: 1,
      sessionCreditPeriodMonth: "2026-07-01",
    });
    expect(entitlements.sessionCreditsRemaining).toBe(0);
    expect(entitlements.entitlementIds).not.toContain("momentum.session_credit");
  });
});

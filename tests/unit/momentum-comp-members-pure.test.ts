import { describe, expect, it } from "vitest";
import {
  isMomentumCompMember,
  resolveMomentumActive,
  momentumCompRenewalLabel,
} from "@/features/entitlements/momentum-comp-members-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";

const activeSubscription: StudentSubscriptionRow = {
  user_id: "user-1",
  stripe_customer_id: "cus_1",
  stripe_subscription_id: "sub_1",
  billing_interval: "annual",
  plan_tier: "momentum",
  local_status: "active",
  stripe_status: "active",
  current_period_end: "2026-12-31T00:00:00.000Z",
  cancel_at_period_end: false,
  mismatch_flagged_at: null,
};

describe("isMomentumCompMember", () => {
  it("matches trapdimej by email local part", () => {
    expect(isMomentumCompMember({ email: "trapdimej@gmail.com" })).toBe(true);
  });

  it("matches trapdime by email local part", () => {
    expect(isMomentumCompMember({ email: "trapdime@example.com" })).toBe(true);
  });

  it("matches trapdimej display name", () => {
    expect(isMomentumCompMember({ displayName: "trapdimej" })).toBe(true);
  });

  it("rejects unrelated accounts", () => {
    expect(isMomentumCompMember({ email: "other@example.com", displayName: "student" })).toBe(
      false,
    );
  });
});

describe("resolveMomentumActive", () => {
  it("treats comp members as active without Stripe", () => {
    expect(resolveMomentumActive({ subscription: null, compMember: true })).toBe(true);
  });

  it("still requires active subscription when not comp", () => {
    expect(resolveMomentumActive({ subscription: null, compMember: false })).toBe(false);
    expect(resolveMomentumActive({ subscription: activeSubscription, compMember: false })).toBe(
      true,
    );
  });
});

describe("momentumCompRenewalLabel", () => {
  it("returns comp copy for comp members", () => {
    expect(momentumCompRenewalLabel(true)).toBe("Comp Momentum membership active.");
    expect(momentumCompRenewalLabel(false)).toBeNull();
  });
});

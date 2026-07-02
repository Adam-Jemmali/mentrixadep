import { z } from "zod";
import type Stripe from "stripe";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { SubscriptionBillingInterval } from "@/features/pricing/pricing-tiers-pure";

export const subscriptionBillingIntervalSchema = z.enum(["monthly", "annual"]);

export type SubscriptionPlanTier = "momentum";

export type StudentSubscriptionRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_interval: SubscriptionBillingInterval;
  plan_tier: SubscriptionPlanTier;
  local_status: string;
  stripe_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  mismatch_flagged_at: string | null;
};

export function normalizeStripeSubscriptionStatus(status: Stripe.Subscription.Status): string {
  return status;
}

export function mapStripeSubscriptionRow(
  userId: string,
  subscription: any,
  billingInterval: SubscriptionBillingInterval,
  planTier: SubscriptionPlanTier = "momentum",
): Omit<StudentSubscriptionRow, "mismatch_flagged_at"> & {
  mismatch_flagged_at?: string | null;
} {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  return {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    billing_interval: billingInterval,
    plan_tier: planTier,
    local_status: subscription.status,
    stripe_status: subscription.status,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
  };
}

export function isMomentumSubscriptionActive(row: StudentSubscriptionRow | null): boolean {
  if (!row) return false;
  if (row.local_status !== "active" && row.local_status !== "trialing") return false;
  return row.plan_tier === "momentum";
}

export async function upsertStudentSubscriptionFromStripe(
  userId: string,
  subscription: any,
  billingInterval: SubscriptionBillingInterval,
  planTier: SubscriptionPlanTier = "momentum",
): Promise<void> {
  const admin = createAdminClient();
  const payload = mapStripeSubscriptionRow(userId, subscription, billingInterval, planTier);
  const { error } = await admin.from("student_subscriptions").upsert(
    {
      ...payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function getStudentSubscription(
  userId: string,
): Promise<StudentSubscriptionRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("student_subscriptions")
    .select(
      "user_id, stripe_customer_id, stripe_subscription_id, billing_interval, plan_tier, local_status, stripe_status, current_period_end, cancel_at_period_end, mismatch_flagged_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[subscription] read failed:", error.message);
    return null;
  }
  return (data as StudentSubscriptionRow | null)
    ? {
        ...(data as StudentSubscriptionRow),
        plan_tier: "momentum",
      }
    : null;
}

export async function flagSubscriptionStatusMismatch(params: {
  userId: string;
  stripeSubscriptionId: string | null;
  localStatus: string;
  stripeStatus: string;
  detail: string;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("student_subscriptions")
    .update({
      mismatch_flagged_at: now,
      mismatch_detail: params.detail,
      last_reconciled_at: now,
      updated_at: now,
    })
    .eq("user_id", params.userId);

  await admin.from("subscription_status_mismatches").insert({
    user_id: params.userId,
    stripe_subscription_id: params.stripeSubscriptionId,
    local_status: params.localStatus,
    stripe_status: params.stripeStatus,
    detail: params.detail,
  });
}

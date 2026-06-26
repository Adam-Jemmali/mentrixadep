import type Stripe from "stripe";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  flagSubscriptionStatusMismatch,
  subscriptionBillingIntervalSchema,
  upsertStudentSubscriptionFromStripe,
} from "@/features/payments/student-subscription";

function resolveBillingInterval(
  value: string | null | undefined,
): "monthly" | "annual" {
  const parsed = subscriptionBillingIntervalSchema.safeParse(value);
  return parsed.success ? parsed.data : "annual";
}

export async function handleMomentumSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.metadata?.checkout_kind !== "momentum_subscription") return;

  const userId = session.metadata?.user_id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!userId || !subscriptionId) {
    throw new Error("momentum subscription checkout missing user_id or subscription id");
  }

  const stripe = getStripeServer();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const billingInterval = resolveBillingInterval(
    session.metadata?.billing_interval ?? subscription.metadata?.billing_interval,
  );

  await upsertStudentSubscriptionFromStripe(userId, subscription, billingInterval);
}

export async function handleStripeSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const billingInterval = resolveBillingInterval(subscription.metadata?.billing_interval);
  await upsertStudentSubscriptionFromStripe(userId, subscription, billingInterval);
}

export async function handleStripeSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const admin = createAdminClient();
  await admin
    .from("student_subscriptions")
    .update({
      local_status: "canceled",
      stripe_status: subscription.status,
      current_period_end: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function reconcileStudentSubscriptions(): Promise<{
  checked: number;
  mismatches: number;
}> {
  const admin = createAdminClient();
  const stripe = getStripeServer();
  const { data: rows, error } = await admin
    .from("student_subscriptions")
    .select("user_id, stripe_subscription_id, local_status, stripe_status")
    .not("stripe_subscription_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  let mismatches = 0;
  const now = new Date().toISOString();

  for (const row of rows ?? []) {
    const subscriptionId = row.stripe_subscription_id as string;
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const localStatus = String(row.local_status ?? "");
      const stripeStatus = subscription.status;

      await admin
        .from("student_subscriptions")
        .update({
          stripe_status: stripeStatus,
          last_reconciled_at: now,
          updated_at: now,
        })
        .eq("user_id", row.user_id);

      if (localStatus !== stripeStatus) {
        mismatches += 1;
        await flagSubscriptionStatusMismatch({
          userId: row.user_id as string,
          stripeSubscriptionId: subscriptionId,
          localStatus,
          stripeStatus,
          detail: `Reconciliation found local_status=${localStatus} stripe_status=${stripeStatus}`,
        });
      }
    } catch (retrieveErr) {
      mismatches += 1;
      await flagSubscriptionStatusMismatch({
        userId: row.user_id as string,
        stripeSubscriptionId: subscriptionId,
        localStatus: String(row.local_status ?? "unknown"),
        stripeStatus: "unavailable",
        detail:
          retrieveErr instanceof Error ? retrieveErr.message : "Stripe subscription retrieve failed",
      });
    }
  }

  return { checked: rows?.length ?? 0, mismatches };
}

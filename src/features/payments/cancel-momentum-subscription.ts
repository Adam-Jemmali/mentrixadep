"use server";

import { z } from "zod";
import type Stripe from "stripe";
import { requireAuth } from "@/shared/core/auth";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  enforceRateLimit,
  getRateLimitId,
  RATE_LIMITS,
  sanitizeError,
} from "@/shared/core/security";
import { captureUnexpectedError, withStripeApiSpan } from "@/shared/integrations/observability";
import { isMomentumCompMember } from "@/features/entitlements/momentum-comp-members-pure";
import {
  getStudentSubscription,
  upsertStudentSubscriptionFromStripe,
} from "@/features/payments/student-subscription";
import {
  cancelMomentumSuccessCopy,
  resolveMomentumCancelEligibility,
  resumeMomentumSuccessCopy,
} from "@/features/payments/subscription-cancel-pure";

const actionSchema = z.enum(["cancel", "resume"]);

type StripeSubscriptionLike = {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number | null;
  customer?: string | { id: string } | null;
  metadata?: Stripe.Metadata;
};

export type MomentumSubscriptionBillingActionResult =
  | {
      ok: true;
      action: "cancel" | "resume";
      cancelAtPeriodEnd: boolean;
      currentPeriodEnd: string | null;
      verdict: string;
      nextAction: string;
    }
  | { ok: false; error: string };

function periodEndLabelFromIso(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

async function updateMomentumRenewal(
  action: "cancel" | "resume",
): Promise<MomentumSubscriptionBillingActionResult> {
  const user = await requireAuth();
  if (user.role !== "student" && user.role !== "admin") {
    return { ok: false, error: "Only Mentrixers can manage Momentum billing." };
  }

  try {
    enforceRateLimit(getRateLimitId(user.id), RATE_LIMITS.stripeCheckout, "manage Momentum billing");
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }

  const parsed = actionSchema.safeParse(action);
  if (!parsed.success) {
    return { ok: false, error: "Invalid billing action." };
  }

  const compMember = isMomentumCompMember({
    email: user.email,
    displayName: user.displayName,
  });
  const subscription = await getStudentSubscription(user.id);
  const eligibility = resolveMomentumCancelEligibility({
    subscription,
    momentumCompMember: compMember,
  });

  if (parsed.data === "cancel") {
    if (!eligibility.canCancel) {
      return {
        ok: false,
        error:
          "canResume" in eligibility && eligibility.canResume
            ? "Renewal is already off. Resume it if you want billing to continue."
            : "reason" in eligibility
              ? eligibility.reason
              : "Cannot cancel this membership.",
      };
    }
  } else if (!eligibility.canResume) {
    return {
      ok: false,
      error:
        "canCancel" in eligibility && eligibility.canCancel
          ? "Renewal is already on."
          : "reason" in eligibility
            ? eligibility.reason
            : "Cannot resume this membership.",
    };
  }

  const stripeSubscriptionId = subscription!.stripe_subscription_id!;
  const stripe = getStripeServer();

  try {
    const updated = (await withStripeApiSpan(
      parsed.data === "cancel"
        ? "subscriptions.update.cancel_at_period_end"
        : "subscriptions.update.resume_renewal",
      () =>
        stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: parsed.data === "cancel",
        }),
    )) as StripeSubscriptionLike;

    const billingInterval =
      subscription!.billing_interval === "monthly" ? "monthly" : "annual";
    await upsertStudentSubscriptionFromStripe(user.id, updated, billingInterval, "momentum");

    const currentPeriodEnd = updated.current_period_end
      ? new Date(updated.current_period_end * 1000).toISOString()
      : subscription!.current_period_end;
    const label = periodEndLabelFromIso(currentPeriodEnd);
    const copy =
      parsed.data === "cancel"
        ? cancelMomentumSuccessCopy(label)
        : resumeMomentumSuccessCopy(label);

    return {
      ok: true,
      action: parsed.data,
      cancelAtPeriodEnd: updated.cancel_at_period_end ?? parsed.data === "cancel",
      currentPeriodEnd,
      verdict: copy.verdict,
      nextAction: copy.nextAction,
    };
  } catch (err) {
    captureUnexpectedError("momentum-subscription-billing", err);
    return {
      ok: false,
      error: sanitizeError(err) || "Could not update Momentum billing. Try again.",
    };
  }
}

export async function cancelMomentumSubscription(): Promise<MomentumSubscriptionBillingActionResult> {
  return updateMomentumRenewal("cancel");
}

export async function resumeMomentumSubscription(): Promise<MomentumSubscriptionBillingActionResult> {
  return updateMomentumRenewal("resume");
}

/** Used by checkout to refuse a second active Stripe subscription. */
export async function assertNoActiveMomentumSubscription(userId: string): Promise<string | null> {
  const row = await getStudentSubscription(userId);
  const eligibility = resolveMomentumCancelEligibility({ subscription: row });
  if (eligibility.canCancel || eligibility.canResume) {
    return "You already have an active Momentum membership. Manage renewal from your membership page.";
  }

  if (
    row?.stripe_subscription_id &&
    (row.local_status === "active" || row.local_status === "trialing")
  ) {
    return "You already have an active Momentum membership.";
  }

  if (row?.stripe_subscription_id) {
    try {
      const stripe = getStripeServer();
      const remote = (await stripe.subscriptions.retrieve(
        row.stripe_subscription_id,
      )) as StripeSubscriptionLike;
      if (remote.status === "active" || remote.status === "trialing") {
        const admin = createAdminClient();
        await admin
          .from("student_subscriptions")
          .update({
            local_status: remote.status,
            stripe_status: remote.status,
            cancel_at_period_end: remote.cancel_at_period_end ?? false,
            current_period_end: remote.current_period_end
              ? new Date(remote.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        return "You already have an active Momentum membership. Manage renewal from your membership page.";
      }
    } catch {
      // Fall through to allow checkout if Stripe retrieve fails; webhook/reconcile will heal.
    }
  }

  return null;
}

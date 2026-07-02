import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { captureUnexpectedError } from "@/shared/integrations/observability";
import {
  momentumCreditRedemptionKey,
  utcPeriodMonthKey,
  type MomentumSessionCreditGrantSource,
} from "@/features/entitlements/session-credits-pure";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import { getStudentSubscription } from "@/features/payments/student-subscription";

export type MomentumSessionCreditRow = {
  id: string;
  user_id: string;
  period_month: string;
  credits_granted: number;
  credits_remaining: number;
};

export async function getCurrentMomentumSessionCredit(
  userId: string,
): Promise<MomentumSessionCreditRow | null> {
  const admin = createAdminClient();
  const periodMonth = utcPeriodMonthKey();
  const { data, error } = await admin
    .from("momentum_session_credits")
    .select("id, user_id, period_month, credits_granted, credits_remaining")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (error) {
    console.warn("[session-credits] read failed:", error.message);
    return null;
  }
  if (!data || (data.credits_remaining ?? 0) <= 0) {
    return null;
  }
  return data as MomentumSessionCreditRow;
}

export async function grantMomentumMonthlySessionCredit(params: {
  userId: string;
  grantSource: MomentumSessionCreditGrantSource;
  stripeInvoiceId?: string | null;
  periodMonth?: string;
}): Promise<"granted" | "skipped"> {
  const subscription = await getStudentSubscription(params.userId);
  if (!isMomentumSubscriptionActive(subscription)) {
    return "skipped";
  }

  const admin = createAdminClient();
  const periodMonth = params.periodMonth ?? utcPeriodMonthKey();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("momentum_session_credits")
    .select("id")
    .eq("user_id", params.userId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (existing) {
    return "skipped";
  }

  if (params.stripeInvoiceId) {
    const { data: byInvoice } = await admin
      .from("momentum_session_credits")
      .select("id")
      .eq("stripe_invoice_id", params.stripeInvoiceId)
      .maybeSingle();
    if (byInvoice) {
      return "skipped";
    }
  }

  const { error } = await admin.from("momentum_session_credits").insert({
    user_id: params.userId,
    period_month: periodMonth,
    credits_granted: 1,
    credits_remaining: 1,
    stripe_invoice_id: params.stripeInvoiceId ?? null,
    grant_source: params.grantSource,
    updated_at: now,
  });

  if (error) {
    if (error.code === "23505") {
      return "skipped";
    }
    throw new Error(error.message);
  }

  return "granted";
}

export async function grantMomentumPackCredits(params: {
  userId: string;
  credits: number;
  stripeCheckoutSessionId: string;
}): Promise<void> {
  const subscription = await getStudentSubscription(params.userId);
  if (!isMomentumSubscriptionActive(subscription)) {
    return;
  }

  const admin = createAdminClient();
  const periodMonth = utcPeriodMonthKey();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("momentum_session_credits")
    .select("id, credits_granted, credits_remaining")
    .eq("user_id", params.userId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (existing) {
    await admin
      .from("momentum_session_credits")
      .update({
        credits_granted: (existing.credits_granted as number) + params.credits,
        credits_remaining: (existing.credits_remaining as number) + params.credits,
        stripe_invoice_id: params.stripeCheckoutSessionId,
        updated_at: now,
      })
      .eq("id", existing.id);
    return;
  }

  await admin.from("momentum_session_credits").insert({
    user_id: params.userId,
    period_month: periodMonth,
    credits_granted: params.credits,
    credits_remaining: params.credits,
    stripe_invoice_id: params.stripeCheckoutSessionId,
    grant_source: "subscription_checkout",
    updated_at: now,
  });
}

export async function grantMonthlyCreditsForActiveMomentumSubscribers(): Promise<{
  checked: number;
  granted: number;
}> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("student_subscriptions")
    .select("user_id, local_status")
    .in("local_status", ["active", "trialing"]);

  if (error) {
    throw new Error(error.message);
  }

  let granted = 0;
  for (const row of rows ?? []) {
    const result = await grantMomentumMonthlySessionCredit({
      userId: row.user_id as string,
      grantSource: "monthly_grant",
    });
    if (result === "granted") {
      granted += 1;
    }
  }

  return { checked: rows?.length ?? 0, granted };
}

export type ConsumeMomentumSessionCreditResult =
  | { ok: true; creditId: string; alreadyRedeemed: boolean }
  | { ok: false; reason: "no_credit" | "race_lost" };

export async function consumeMomentumSessionCredit(params: {
  userId: string;
  availabilityId: string;
}): Promise<ConsumeMomentumSessionCreditResult> {
  const admin = createAdminClient();
  const idempotencyKey = momentumCreditRedemptionKey(params.userId, params.availabilityId);

  const { data: existingRedemption } = await admin
    .from("momentum_session_credit_redemptions")
    .select("credit_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingRedemption?.credit_id) {
    return {
      ok: true,
      creditId: existingRedemption.credit_id as string,
      alreadyRedeemed: true,
    };
  }

  const credit = await getCurrentMomentumSessionCredit(params.userId);
  if (!credit) {
    return { ok: false, reason: "no_credit" };
  }

  const currentRemaining = credit.credits_remaining;
  const { data: updatedCredit, error: updateError } = await admin
    .from("momentum_session_credits")
    .update({
      credits_remaining: currentRemaining - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credit.id)
    .eq("credits_remaining", currentRemaining)
    .gt("credits_remaining", 0)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedCredit) {
    return { ok: false, reason: "race_lost" };
  }

  const { error: redemptionError } = await admin.from("momentum_session_credit_redemptions").insert({
    credit_id: credit.id,
    user_id: params.userId,
    availability_id: params.availabilityId,
    idempotency_key: idempotencyKey,
  });

  if (redemptionError) {
    if (redemptionError.code === "23505") {
      const { data: raced } = await admin
        .from("momentum_session_credit_redemptions")
        .select("credit_id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (raced?.credit_id) {
        return {
          ok: true,
          creditId: raced.credit_id as string,
          alreadyRedeemed: true,
        };
      }
    }

    await admin
      .from("momentum_session_credits")
      .update({
        credits_remaining: currentRemaining,
        updated_at: new Date().toISOString(),
      })
      .eq("id", credit.id)
      .eq("credits_remaining", currentRemaining - 1);

    captureUnexpectedError("consume-momentum-session-credit", redemptionError, params);
    return { ok: false, reason: "race_lost" };
  }

  return { ok: true, creditId: credit.id, alreadyRedeemed: false };
}

export async function restoreMomentumSessionCredit(params: {
  userId: string;
  availabilityId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const idempotencyKey = momentumCreditRedemptionKey(params.userId, params.availabilityId);

  const { data: redemption } = await admin
    .from("momentum_session_credit_redemptions")
    .select("id, credit_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (!redemption) {
    return;
  }

  const { data: credit } = await admin
    .from("momentum_session_credits")
    .select("credits_remaining, credits_granted")
    .eq("id", redemption.credit_id)
    .maybeSingle();

  if (credit) {
    const nextRemaining = Math.min(
      (credit.credits_granted as number) ?? 1,
      ((credit.credits_remaining as number) ?? 0) + 1,
    );
    await admin
      .from("momentum_session_credits")
      .update({
        credits_remaining: nextRemaining,
        updated_at: new Date().toISOString(),
      })
      .eq("id", redemption.credit_id);
  }

  await admin.from("momentum_session_credit_redemptions").delete().eq("id", redemption.id);
}

export async function linkMomentumCreditRedemptionToSessionRequest(params: {
  userId: string;
  availabilityId: string;
  sessionRequestId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const idempotencyKey = momentumCreditRedemptionKey(params.userId, params.availabilityId);
  await admin
    .from("momentum_session_credit_redemptions")
    .update({ session_request_id: params.sessionRequestId })
    .eq("idempotency_key", idempotencyKey);
}

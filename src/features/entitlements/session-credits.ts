import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { captureUnexpectedError } from "@/shared/integrations/observability";
import {
  buildPackSprintState,
  packSprintExpiryIso,
  selectCreditConsumeCandidate,
  type PackSprintState,
} from "@/features/entitlements/pack-sprint-pure";
import {
  momentumCreditRedemptionKey,
  utcPeriodMonthKey,
  type MomentumSessionCreditGrantSource,
} from "@/features/entitlements/session-credits-pure";
import {
  getStudentSubscription,
  isMomentumSubscriptionActive,
} from "@/features/payments/student-subscription";

export type MomentumSessionCreditRow = {
  id: string;
  user_id: string;
  period_month: string;
  credits_granted: number;
  credits_remaining: number;
};

export type MomentumPackCreditRow = {
  id: string;
  user_id: string;
  credits_granted: number;
  credits_remaining: number;
  expires_at: string;
  granted_at: string;
};

export type MomentumSessionCreditsSummary = {
  monthlyCredit: MomentumSessionCreditRow | null;
  monthlyRemaining: number;
  packRemaining: number;
  totalRemaining: number;
  packSprint: PackSprintState | null;
};

async function getMonthlyMomentumSessionCreditRow(
  userId: string,
  periodMonth: string = utcPeriodMonthKey(),
): Promise<MomentumSessionCreditRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("momentum_session_credits")
    .select("id, user_id, period_month, credits_granted, credits_remaining")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (error) {
    console.warn("[session-credits] monthly read failed:", error.message);
    return null;
  }
  return (data as MomentumSessionCreditRow | null) ?? null;
}

async function getEarliestActivePackCreditRow(userId: string): Promise<MomentumPackCreditRow | null> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("momentum_pack_credits")
    .select("id, user_id, credits_granted, credits_remaining, expires_at, granted_at")
    .eq("user_id", userId)
    .gt("credits_remaining", 0)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[session-credits] pack read failed:", error.message);
    return null;
  }
  return (data as MomentumPackCreditRow | null) ?? null;
}

export async function getActivePackSprintState(userId: string): Promise<PackSprintState | null> {
  const pack = await getEarliestActivePackCreditRow(userId);
  if (!pack) return null;
  return buildPackSprintState({
    creditsRemaining: pack.credits_remaining,
    creditsGranted: pack.credits_granted,
    expiresAt: pack.expires_at,
  });
}

export async function getMomentumSessionCreditsSummary(
  userId: string,
): Promise<MomentumSessionCreditsSummary> {
  const [monthlyCredit, packCredit] = await Promise.all([
    getMonthlyMomentumSessionCreditRow(userId),
    getEarliestActivePackCreditRow(userId),
  ]);

  const monthlyRemaining =
    monthlyCredit && (monthlyCredit.credits_remaining ?? 0) > 0
      ? monthlyCredit.credits_remaining
      : 0;
  const packRemaining =
    packCredit && (packCredit.credits_remaining ?? 0) > 0 ? packCredit.credits_remaining : 0;

  const packSprint = packCredit
    ? buildPackSprintState({
        creditsRemaining: packCredit.credits_remaining,
        creditsGranted: packCredit.credits_granted,
        expiresAt: packCredit.expires_at,
      })
    : null;

  return {
    monthlyCredit: monthlyRemaining > 0 ? monthlyCredit : null,
    monthlyRemaining,
    packRemaining,
    totalRemaining: monthlyRemaining + packRemaining,
    packSprint,
  };
}

/** Monthly included credit only (credit escalation, monthly nudges). */
export async function getCurrentMomentumSessionCredit(
  userId: string,
): Promise<MomentumSessionCreditRow | null> {
  const credit = await getMonthlyMomentumSessionCreditRow(userId);
  if (!credit || (credit.credits_remaining ?? 0) <= 0) {
    return null;
  }
  return credit;
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
}): Promise<"granted" | "skipped"> {
  const subscription = await getStudentSubscription(params.userId);
  if (!isMomentumSubscriptionActive(subscription)) {
    return "skipped";
  }

  const admin = createAdminClient();
  const grantedAt = new Date();
  const now = grantedAt.toISOString();

  const { data: existing } = await admin
    .from("momentum_pack_credits")
    .select("id")
    .eq("stripe_checkout_session_id", params.stripeCheckoutSessionId)
    .maybeSingle();

  if (existing) {
    return "skipped";
  }

  const { error } = await admin.from("momentum_pack_credits").insert({
    user_id: params.userId,
    credits_granted: params.credits,
    credits_remaining: params.credits,
    stripe_checkout_session_id: params.stripeCheckoutSessionId,
    granted_at: now,
    expires_at: packSprintExpiryIso(grantedAt),
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

export async function grantMonthlyCreditsForActiveMomentumSubscribers(): Promise<{
  checked: number;
  granted: number;
}> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("student_subscriptions")
    .select("user_id, local_status, plan_tier")
    .eq("plan_tier", "momentum")
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

function redemptionCreditId(row: {
  credit_id: string | null;
  pack_credit_id: string | null;
}): string | null {
  return row.credit_id ?? row.pack_credit_id;
}

export async function consumeMomentumSessionCredit(params: {
  userId: string;
  availabilityId: string;
}): Promise<ConsumeMomentumSessionCreditResult> {
  const admin = createAdminClient();
  const idempotencyKey = momentumCreditRedemptionKey(params.userId, params.availabilityId);

  const { data: existingRedemption } = await admin
    .from("momentum_session_credit_redemptions")
    .select("credit_id, pack_credit_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  const existingCreditId = existingRedemption ? redemptionCreditId(existingRedemption) : null;
  if (existingCreditId) {
    return {
      ok: true,
      creditId: existingCreditId,
      alreadyRedeemed: true,
    };
  }

  const [monthlyCredit, packCredit] = await Promise.all([
    getMonthlyMomentumSessionCreditRow(params.userId),
    getEarliestActivePackCreditRow(params.userId),
  ]);

  const candidate = selectCreditConsumeCandidate({
    pack: packCredit
      ? {
          id: packCredit.id,
          creditsRemaining: packCredit.credits_remaining,
          expiresAt: packCredit.expires_at,
        }
      : null,
    monthly:
      monthlyCredit && monthlyCredit.credits_remaining > 0
        ? {
            id: monthlyCredit.id,
            creditsRemaining: monthlyCredit.credits_remaining,
            periodMonth: monthlyCredit.period_month,
          }
        : null,
  });

  if (!candidate) {
    return { ok: false, reason: "no_credit" };
  }

  const now = new Date().toISOString();
  const table = candidate.kind === "pack" ? "momentum_pack_credits" : "momentum_session_credits";
  const currentRemaining = candidate.creditsRemaining;

  const { data: updatedCredit, error: updateError } = await admin
    .from(table)
    .update({
      credits_remaining: currentRemaining - 1,
      updated_at: now,
    })
    .eq("id", candidate.id)
    .eq("credits_remaining", currentRemaining)
    .gt("credits_remaining", 0)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedCredit) {
    return { ok: false, reason: "race_lost" };
  }

  const redemptionInsert =
    candidate.kind === "pack"
      ? {
          pack_credit_id: candidate.id,
          credit_id: null,
          user_id: params.userId,
          availability_id: params.availabilityId,
          idempotency_key: idempotencyKey,
        }
      : {
          credit_id: candidate.id,
          pack_credit_id: null,
          user_id: params.userId,
          availability_id: params.availabilityId,
          idempotency_key: idempotencyKey,
        };

  const { error: redemptionError } = await admin
    .from("momentum_session_credit_redemptions")
    .insert(redemptionInsert);

  if (redemptionError) {
    if (redemptionError.code === "23505") {
      const { data: raced } = await admin
        .from("momentum_session_credit_redemptions")
        .select("credit_id, pack_credit_id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      const racedId = raced ? redemptionCreditId(raced) : null;
      if (racedId) {
        return {
          ok: true,
          creditId: racedId,
          alreadyRedeemed: true,
        };
      }
    }

    await admin
      .from(table)
      .update({
        credits_remaining: currentRemaining,
        updated_at: now,
      })
      .eq("id", candidate.id)
      .eq("credits_remaining", currentRemaining - 1);

    captureUnexpectedError("consume-momentum-session-credit", redemptionError, params);
    return { ok: false, reason: "race_lost" };
  }

  return { ok: true, creditId: candidate.id, alreadyRedeemed: false };
}

export async function restoreMomentumSessionCredit(params: {
  userId: string;
  availabilityId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const idempotencyKey = momentumCreditRedemptionKey(params.userId, params.availabilityId);

  const { data: redemption } = await admin
    .from("momentum_session_credit_redemptions")
    .select("id, credit_id, pack_credit_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (!redemption) {
    return;
  }

  if (redemption.pack_credit_id) {
    const { data: packCredit } = await admin
      .from("momentum_pack_credits")
      .select("credits_remaining, credits_granted")
      .eq("id", redemption.pack_credit_id)
      .maybeSingle();

    if (packCredit) {
      const nextRemaining = Math.min(
        (packCredit.credits_granted as number) ?? 1,
        ((packCredit.credits_remaining as number) ?? 0) + 1,
      );
      await admin
        .from("momentum_pack_credits")
        .update({
          credits_remaining: nextRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq("id", redemption.pack_credit_id);
    }
  } else if (redemption.credit_id) {
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

export type GrantMomentumSlaMakeGoodCreditResult =
  | { ok: true; creditId: string }
  | { ok: false; reason: "not_subscriber" | "update_failed" };

/** Restore one included session credit after a failed Loop SLA (idempotent at grant row level). */
export async function grantMomentumSlaMakeGoodCredit(params: {
  userId: string;
}): Promise<GrantMomentumSlaMakeGoodCreditResult> {
  const subscription = await getStudentSubscription(params.userId);
  if (!isMomentumSubscriptionActive(subscription)) {
    return { ok: false, reason: "not_subscriber" };
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
    const { data: updated, error } = await admin
      .from("momentum_session_credits")
      .update({
        credits_granted: (existing.credits_granted as number) + 1,
        credits_remaining: (existing.credits_remaining as number) + 1,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();

    if (error || !updated) {
      return { ok: false, reason: "update_failed" };
    }
    return { ok: true, creditId: updated.id as string };
  }

  const { data: inserted, error: insertError } = await admin
    .from("momentum_session_credits")
    .insert({
      user_id: params.userId,
      period_month: periodMonth,
      credits_granted: 1,
      credits_remaining: 1,
      grant_source: "sla_makegood",
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !inserted) {
    return { ok: false, reason: "update_failed" };
  }

  return { ok: true, creditId: inserted.id as string };
}

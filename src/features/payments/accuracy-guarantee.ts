import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { captureUnexpectedError } from "@/shared/integrations/observability";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import {
  isGuaranteeEvaluationReady,
  shouldRefundAccuracyGuarantee,
} from "@/features/breakthrough-events/post-session-retest";

type GuaranteeAction = "none" | "refunded" | "skipped";

async function issueAccuracyGuaranteeRefund(
  paymentIntentId: string,
  sessionId: string
): Promise<{ refundId: string; amountCents: number }> {
  const stripe = getStripeServer();
  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntentId, reason: "requested_by_customer" },
    { idempotencyKey: `accuracy_guarantee_${sessionId}` }
  );
  return { refundId: refund.id, amountCents: refund.amount };
}

async function markLedgerRefunded(sessionId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("tutor_payout_ledger")
    .update({ status: "refunded" })
    .eq("session_id", sessionId)
    .in("status", ["pending", "held"]);
  await admin.from("sessions").update({ payout_status: "refunded" }).eq("id", sessionId);
}

export async function checkGuaranteeForSession(sessionId: string): Promise<{
  action: GuaranteeAction;
}> {
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select(
      "id, course, status, end_time, stripe_payment_intent_id, stripe_refund_id, stripe_refund_reason"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { action: "skipped" };
  if (!isApCalculusAbSubject(session.course)) return { action: "skipped" };
  if (session.status !== "completed") return { action: "skipped" };
  if (session.stripe_refund_id) return { action: "skipped" };

  const { data: targets } = await admin
    .from("session_target_nodes")
    .select("pre_session_correct, post_session_correct, post_session_checked_at")
    .eq("session_id", sessionId);

  if (!targets || targets.length !== 3) return { action: "skipped" };
  if (!isGuaranteeEvaluationReady(targets, session.end_time)) return { action: "none" };
  if (!shouldRefundAccuracyGuarantee(targets)) return { action: "none" };

  const paymentIntentId = session.stripe_payment_intent_id;
  if (!paymentIntentId) return { action: "skipped" };

  try {
    const { refundId } = await issueAccuracyGuaranteeRefund(paymentIntentId, sessionId);
    await admin
      .from("sessions")
      .update({
        stripe_refund_id: refundId,
        stripe_refund_reason: "accuracy_guarantee",
      })
      .eq("id", sessionId)
      .is("stripe_refund_id", null);

    await markLedgerRefunded(sessionId);
    return { action: "refunded" };
  } catch (err) {
    captureUnexpectedError("accuracy-guarantee-refund", err, { sessionId });
    console.error("[accuracy-guarantee] refund failed:", err);
    return { action: "skipped" };
  }
}

export async function runAccuracyGuaranteeChecks(): Promise<{
  checked: number;
  refunded: number;
}> {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, course, end_time")
    .eq("status", "completed")
    .is("stripe_refund_id", null);

  const apCalcSessions = (sessions ?? []).filter((row) => isApCalculusAbSubject(row.course));
  const sessionIds = new Set<string>();

  for (const session of apCalcSessions) {
    if (session.end_time <= sevenDaysAgo) {
      sessionIds.add(session.id);
    }
  }

  for (const session of apCalcSessions) {
    const { data: targets } = await admin
      .from("session_target_nodes")
      .select("post_session_correct")
      .eq("session_id", session.id);

    if (
      targets?.length === 3 &&
      targets.every((row) => row.post_session_correct !== null)
    ) {
      sessionIds.add(session.id);
    }
  }

  let checked = 0;
  let refunded = 0;

  for (const sessionId of sessionIds) {
    checked += 1;
    const result = await checkGuaranteeForSession(sessionId);
    if (result.action === "refunded") refunded += 1;
  }

  return { checked, refunded };
}

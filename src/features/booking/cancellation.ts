"use server";

/**
 * Session cancellation & refund actions.
 *
 * - Student cancels > 24h before: 100% refund via Stripe API
 * - Student cancels < 24h before: no refund (tutor gets paid)
 * - Tutor cancels: 100% refund + 500 XP compensation to student + flag on tutor account
 *
 * All mutations use the Supabase admin client (service role) for
 * cross-table writes that bypass RLS. Auth is validated first via requireRole().
 */

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { revalidatePath } from "next/cache";
import { applyXpAward } from "@/features/xp/xp-awards";
import {
  sendStudentCancelledEmail,
  sendTutorCancelledEmail,
  sendRefundIssuedEmail as _sendRefundIssuedEmail,
  type SessionEmailDetails,
} from "@/shared/integrations/email";

void _sendRefundIssuedEmail;
import { captureUnexpectedError } from "@/shared/integrations/observability";
import { isStudentCancelRefundEligible } from "@/features/booking/refund-eligibility";

// ─── Constants ────────────────────────────────────────────────────────────────

/** XP awarded to student when a tutor cancels their confirmed session. */
const TUTOR_CANCEL_STUDENT_XP = 500;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CancellationResult {
  success: true;
  refunded: boolean;
  refundCents: number | null;
  xpAwarded: number | null;
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function issueFullRefund(
  paymentIntentId: string,
  idempotencyKey: string
): Promise<{ refundId: string; amountCents: number }> {
  const stripe = getStripeServer();
  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntentId, reason: "requested_by_customer" },
    { idempotencyKey }
  );
  return { refundId: refund.id, amountCents: refund.amount };
}

async function resolveSessionParticipants(sessionId: string) {
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) return null;

  const [studentAuth, tutorAuth, settings] = await Promise.all([
    admin.auth.admin.getUserById(session.student_id).catch(() => null),
    admin.auth.admin.getUserById(session.tutor_id).catch(() => null),
    admin
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", [session.student_id, session.tutor_id]),
  ]);

  const nameByUser = Object.fromEntries(
    (settings.data ?? []).map((r) => [r.user_id, r.display_name as string | null])
  );

  return {
    session,
    studentEmail: studentAuth?.data?.user?.email ?? null,
    tutorEmail: tutorAuth?.data?.user?.email ?? null,
    studentName: nameByUser[session.student_id] ?? null,
    tutorName: nameByUser[session.tutor_id] ?? null,
  };
}

// ─── Student cancel ───────────────────────────────────────────────────────────

/**
 * Allows a student (or admin acting on behalf) to cancel a confirmed session.
 * Issues a Stripe refund if within the grace window, otherwise no refund.
 */
export async function studentCancelSession(
  sessionId: string,
  onBehalfOfStudentId?: string
): Promise<CancellationResult> {
  const user = await requireRole(["student", "admin"]);
  const actingAsId =
    user.role === "admin" && onBehalfOfStudentId
      ? onBehalfOfStudentId
      : user.id;

  const admin = createAdminClient();

  // Fetch session
  const { data: session, error: fetchErr } = await admin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("student_id", actingAsId)
    .single();

  if (fetchErr || !session) {
    throw new Error("Session not found or you do not have permission to cancel it.");
  }

  if (session.status === "cancelled") {
    throw new Error("This session has already been cancelled.");
  }

  if (session.status === "completed") {
    throw new Error("Cannot cancel a completed session.");
  }

  const isRefundEligible = isStudentCancelRefundEligible(session.start_time);

  // ── Mark session cancelled ─────────────────────────────────────────────────
  const { error: updateErr } = await admin
    .from("sessions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by_role: "student",
    })
    .eq("id", sessionId)
    .eq("student_id", actingAsId);

  if (updateErr) {
    // Graceful fallback for older schema without cancelled_at
    await admin
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", sessionId)
      .eq("student_id", actingAsId);
  }

  // ── Unlock availability slot ───────────────────────────────────────────────
  if (session.availability_id) {
    await admin
      .from("availability")
      .update({
        booking_status: "available",
        locked_until: null,
        locked_by: null,
      })
      .eq("id", session.availability_id);
  }

  // ── Stripe refund ──────────────────────────────────────────────────────────
  let refundCents: number | null = null;
  const paymentIntentId =
    session.stripe_payment_intent_id ??
    (session as { stripe_payment_intent_id?: string }).stripe_payment_intent_id ??
    null;

  if (isRefundEligible && paymentIntentId) {
    try {
      const { refundId, amountCents } = await issueFullRefund(
        paymentIntentId,
        `student_cancel_${sessionId}`
      );
      refundCents = amountCents;

      await admin
        .from("sessions")
        .update({ stripe_refund_id: refundId, stripe_refund_reason: "student_cancelled" })
        .eq("id", sessionId);
    } catch (refundErr) {
      captureUnexpectedError("student-cancel-refund", refundErr, { sessionId });
      console.error("[cancellation] refund failed:", refundErr);
    }
  }

  // ── Fire-and-forget emails ─────────────────────────────────────────────────
  try {
    const participants = await resolveSessionParticipants(sessionId);
    if (participants) {
      const { studentEmail, tutorEmail, studentName, tutorName } = participants;
      const emailDetails: SessionEmailDetails = {
        sessionId,
        course: session.course,
        startTime: session.start_time,
        endTime: session.end_time,
        studentDisplayName: studentName,
        tutorDisplayName: tutorName,
        priceCents: session.price_cents ?? null,
      };
      if (studentEmail) {
        void sendStudentCancelledEmail(studentEmail, {
          ...emailDetails,
          refunded: isRefundEligible,
          refundCents,
        });
      }
      if (tutorEmail) {
        void sendStudentCancelledEmail(tutorEmail, {
          ...emailDetails,
          refunded: false,
          refundCents: null,
          recipientRole: "tutor",
        });
      }
    }
  } catch (emailErr) {
    console.error("[cancellation] email failed:", emailErr);
  }

  revalidatePath("/student");
  revalidatePath("/tutor");

  const message = isRefundEligible
    ? "Session cancelled. Your refund will appear within 5–10 business days."
    : "Session cancelled. No refund is available within 24 hours of the session.";

  return { success: true, refunded: isRefundEligible, refundCents, xpAwarded: null, message };
}

// ─── Tutor cancel ─────────────────────────────────────────────────────────────

/**
 * Allows a tutor (or admin acting on behalf) to cancel a confirmed session.
 * Triggers: 100% student refund + 500 XP to student + flag on tutor's account.
 */
export async function tutorCancelSession(
  sessionId: string,
  onBehalfOfTutorId?: string
): Promise<CancellationResult> {
  const user = await requireRole(["tutor", "admin"]);
  const actingAsId =
    user.role === "admin" && onBehalfOfTutorId
      ? onBehalfOfTutorId
      : user.id;

  const admin = createAdminClient();

  // Fetch session
  const { data: session, error: fetchErr } = await admin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("tutor_id", actingAsId)
    .single();

  if (fetchErr || !session) {
    throw new Error("Session not found or you do not have permission to cancel it.");
  }

  if (session.status === "cancelled") {
    throw new Error("This session has already been cancelled.");
  }

  if (session.status === "completed") {
    throw new Error("Cannot cancel a completed session.");
  }

  // ── Mark session cancelled ─────────────────────────────────────────────────
  const { error: updateErr } = await admin
    .from("sessions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by_role: "tutor",
    })
    .eq("id", sessionId)
    .eq("tutor_id", actingAsId);

  if (updateErr) {
    await admin
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", sessionId)
      .eq("tutor_id", actingAsId);
  }

  // ── Unlock availability slot ───────────────────────────────────────────────
  if (session.availability_id) {
    await admin
      .from("availability")
      .update({
        booking_status: "available",
        locked_until: null,
        locked_by: null,
      })
      .eq("id", session.availability_id);
  }

  // ── Full Stripe refund to student ─────────────────────────────────────────
  let refundCents: number | null = null;
  const paymentIntentId =
    (session as { stripe_payment_intent_id?: string }).stripe_payment_intent_id ?? null;

  if (paymentIntentId) {
    try {
      const { refundId, amountCents } = await issueFullRefund(
        paymentIntentId,
        `tutor_cancel_${sessionId}`
      );
      refundCents = amountCents;

      await admin
        .from("sessions")
        .update({ stripe_refund_id: refundId, stripe_refund_reason: "tutor_cancelled" })
        .eq("id", sessionId);
    } catch (refundErr) {
      captureUnexpectedError("tutor-cancel-refund", refundErr, { sessionId });
      console.error("[cancellation] tutor cancel refund failed:", refundErr);
    }
  }

  // ── XP compensation to student ────────────────────────────────────────────
  let xpAwarded: number | null = null;
  try {
    const xpResult = await applyXpAward(
      session.student_id,
      TUTOR_CANCEL_STUDENT_XP,
      `tutor_cancel_compensation:${sessionId}`,
      null
    );
    if (xpResult.awarded) xpAwarded = TUTOR_CANCEL_STUDENT_XP;
  } catch (xpErr) {
    captureUnexpectedError("tutor-cancel-xp", xpErr, { sessionId });
    console.error("[cancellation] XP compensation failed:", xpErr);
  }

  // ── Flag tutor account ────────────────────────────────────────────────────
  try {
    // Increment a cancellation_count on the tutor's user record.
    // If the column doesn't exist yet, we silently ignore the error.
    await admin.rpc("increment_tutor_cancel_count", { p_tutor_id: actingAsId }).throwOnError();
  } catch {
    // Column/function may not exist in older schemas — non-fatal
    console.warn("[cancellation] tutor flag rpc not available (non-fatal)");
  }

  // ── Fire-and-forget emails ─────────────────────────────────────────────────
  try {
    const participants = await resolveSessionParticipants(sessionId);
    if (participants) {
      const { studentEmail, tutorEmail, studentName, tutorName } = participants;
      const emailDetails: SessionEmailDetails = {
        sessionId,
        course: session.course,
        startTime: session.start_time,
        endTime: session.end_time,
        studentDisplayName: studentName,
        tutorDisplayName: tutorName,
        priceCents: session.price_cents ?? null,
      };
      if (studentEmail) {
        void sendTutorCancelledEmail(studentEmail, {
          ...emailDetails,
          xpCompensation: TUTOR_CANCEL_STUDENT_XP,
          refundCents,
        });
      }
      if (tutorEmail) {
        void sendTutorCancelledEmail(tutorEmail, {
          ...emailDetails,
          xpCompensation: 0,
          refundCents: null,
          recipientRole: "tutor",
        });
      }
    }
  } catch (emailErr) {
    console.error("[cancellation] email failed:", emailErr);
  }

  revalidatePath("/student");
  revalidatePath("/tutor");

  return {
    success: true,
    refunded: true,
    refundCents,
    xpAwarded,
    message: `Session cancelled. Your learner will receive a full refund${xpAwarded ? ` and ${xpAwarded} XP compensation` : ""}.`,
  };
}

// ─── Admin cancel ─────────────────────────────────────────────────────────────

/**
 * Admin-only: force cancel any session, optionally issuing a refund.
 * Use for dispute resolution.
 */
export async function adminCancelSession(
  sessionId: string,
  options: {
    issueRefund?: boolean;
    cancelledByRole?: "student" | "tutor" | "admin";
    xpCompensationStudentId?: string;
  } = {}
): Promise<CancellationResult> {
  await requireRole(["admin"]);

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  await admin
    .from("sessions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by_role: options.cancelledByRole ?? "admin",
    })
    .eq("id", sessionId);

  if (session.availability_id) {
    await admin
      .from("availability")
      .update({ booking_status: "available", locked_until: null, locked_by: null })
      .eq("id", session.availability_id);
  }

  let refundCents: number | null = null;
  const paymentIntentId =
    (session as { stripe_payment_intent_id?: string }).stripe_payment_intent_id ?? null;

  if (options.issueRefund && paymentIntentId) {
    try {
      const { refundId, amountCents } = await issueFullRefund(
        paymentIntentId,
        `admin_cancel_${sessionId}`
      );
      refundCents = amountCents;
      await admin
        .from("sessions")
        .update({ stripe_refund_id: refundId, stripe_refund_reason: "admin_cancelled" })
        .eq("id", sessionId);
    } catch (refundErr) {
      captureUnexpectedError("admin-cancel-refund", refundErr, { sessionId });
    }
  }

  let xpAwarded: number | null = null;
  if (options.xpCompensationStudentId) {
    try {
      const xpResult = await applyXpAward(
        options.xpCompensationStudentId,
        TUTOR_CANCEL_STUDENT_XP,
        `admin_cancel_compensation:${sessionId}`,
        null
      );
      if (xpResult.awarded) xpAwarded = TUTOR_CANCEL_STUDENT_XP;
    } catch {
      // Non-fatal
    }
  }

  revalidatePath("/student");
  revalidatePath("/tutor");
  revalidatePath("/admin");

  return {
    success: true,
    refunded: !!refundCents,
    refundCents,
    xpAwarded,
    message: "Session cancelled by admin.",
  };
}

// ─── Unlock expired pending slots (cron helper) ────────────────────────────────

/**
 * Called by a cron job to release any slots stuck in `pending_payment`
 * whose `locked_until` timestamp has passed.
 * Returns the count of unlocked slots.
 */
export async function unlockExpiredPendingSlots(): Promise<{ unlocked: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("availability")
    .update({
      booking_status: "available",
      locked_until: null,
      locked_by: null,
    })
    .eq("booking_status", "pending_payment")
    .lt("locked_until", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[cancellation] unlockExpiredPendingSlots error:", error);
    return { unlocked: 0 };
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`[cancellation] unlocked ${count} expired pending slots`);
    revalidatePath("/student");
  }
  return { unlocked: count };
}

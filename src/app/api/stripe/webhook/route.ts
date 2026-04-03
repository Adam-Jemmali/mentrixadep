import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeSecretKey, getStripeWebhookSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookSessionAsUser } from "@/app/actions/student";
import {
  captureStripeWebhookError,
  reportStripeWebhookMissingMetadata,
  reportStripeWebhookMissingSignature,
  captureUnexpectedError,
} from "@/lib/observability";
import {
  sendSessionBookedEmail,
  sendPaymentFailedEmail,
  sendRefundIssuedEmail,
  type SessionEmailDetails,
} from "@/lib/email";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const stripe = new Stripe(getStripeSecretKey());

/**
 * Idempotency guard: returns true if this event was already processed.
 * Inserts a row if not, so concurrent delivery is safe.
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("stripe_webhook_log")
    .insert({ event_id: eventId, event_type: eventType });
  if (error) {
    if (error.code === "23505") return true;
    throw error;
  }
  return false;
}

/** Unlock a slot back to 'available' (idempotent). */
async function unlockSlot(availabilityId: string) {
  const admin = createAdminClient();
  await admin
    .from("availability")
    .update({
      booking_status: "available",
      locked_until: null,
      locked_by: null,
    })
    .eq("id", availabilityId)
    .eq("booking_status", "pending_payment");
}

/** Mark a slot as permanently booked. */
async function markSlotBooked(availabilityId: string, checkoutSessionId: string) {
  const admin = createAdminClient();
  await admin
    .from("availability")
    .update({
      booking_status: "booked",
      locked_until: null,
      locked_by: null,
      stripe_checkout_session_id: checkoutSessionId,
    })
    .eq("id", availabilityId);
}

/** Resolve session participants for email notifications. */
async function resolveParticipants(
  studentId: string,
  tutorId: string
): Promise<{
  studentEmail: string | null;
  tutorEmail: string | null;
  studentName: string | null;
  tutorName: string | null;
}> {
  const admin = createAdminClient();
  const [studentAuth, tutorAuth, settings] = await Promise.all([
    admin.auth.admin.getUserById(studentId).catch(() => null),
    admin.auth.admin.getUserById(tutorId).catch(() => null),
    admin
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", [studentId, tutorId]),
  ]);

  const nameByUser = Object.fromEntries(
    (settings.data ?? []).map((r) => [r.user_id, r.display_name as string | null])
  );

  return {
    studentEmail: studentAuth?.data?.user?.email ?? null,
    tutorEmail: tutorAuth?.data?.user?.email ?? null,
    studentName: nameByUser[studentId] ?? null,
    tutorName: nameByUser[tutorId] ?? null,
  };
}

/** Pull availability + pricing info for email copy. */
async function fetchAvailabilityDetails(availabilityId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("availability")
    .select("course, start_time, end_time, tutor_id, price_per_session")
    .eq("id", availabilityId)
    .maybeSingle();
  return data;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 * → lock slot as booked, create session_request via bookSessionAsUser,
 *   send confirmation emails to both parties.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const availabilityId =
    session.metadata?.availability_id ?? session.metadata?.availabilityId;
  const studentId =
    session.metadata?.student_id ?? session.metadata?.studentId;
  const tutorId =
    session.metadata?.tutor_id ?? session.metadata?.tutorId;

  if (!availabilityId || !studentId) {
    reportStripeWebhookMissingMetadata(session.id);
    console.error("[webhook] checkout.session.completed: missing metadata", session.id);
    return;
  }

  // Mark slot as booked (prevents new checkout sessions for this slot)
  await markSlotBooked(availabilityId, session.id);

  // Create session_request (idempotent — returns existing if already present)
  try {
    await bookSessionAsUser(availabilityId, studentId, {
      stripeCheckoutSessionId: session.id,
    });
    console.log(`[webhook] booking created: availability=${availabilityId} student=${studentId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    const isIdempotent =
      msg.includes("already have") || msg.includes("pending request");
    if (isIdempotent) {
      console.log(`[webhook] idempotent: checkout ${session.id} already booked`);
    } else {
      captureStripeWebhookError("booking", err, { availabilityId, studentId });
      console.error("[webhook] bookSessionAsUser failed:", err);
    }
  }

  // Send confirmation emails
  try {
    if (!tutorId) return;
    const avail = await fetchAvailabilityDetails(availabilityId);
    if (!avail) return;
    const { studentEmail, tutorEmail, studentName, tutorName } =
      await resolveParticipants(studentId, tutorId);
    if (studentEmail && tutorEmail) {
      const details: SessionEmailDetails = {
        sessionId: availabilityId,
        course: avail.course,
        startTime: avail.start_time,
        endTime: avail.end_time,
        studentDisplayName: studentName,
        tutorDisplayName: tutorName,
        priceCents: avail.price_per_session,
      };
      void sendSessionBookedEmail(studentEmail, tutorEmail, details);
    }
  } catch (emailErr) {
    console.error("[webhook] confirmation email failed:", emailErr);
  }
}

/**
 * checkout.session.expired
 * → unlock slot back to 'available', notify student the slot is free again.
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const availabilityId =
    session.metadata?.availability_id ?? session.metadata?.availabilityId;
  const studentId =
    session.metadata?.student_id ?? session.metadata?.studentId;

  if (!availabilityId) {
    console.warn("[webhook] checkout.session.expired: no availabilityId", session.id);
    return;
  }

  await unlockSlot(availabilityId);
  console.log(`[webhook] slot unlocked (expired): availability=${availabilityId}`);

  // Notify student
  try {
    if (!studentId) return;
    const avail = await fetchAvailabilityDetails(availabilityId);
    const admin = createAdminClient();
    const { data: studentAuth } = await admin.auth.admin.getUserById(studentId);
    const studentEmail = studentAuth?.user?.email;
    if (studentEmail && avail) {
      void sendPaymentFailedEmail(studentEmail, {
        course: avail.course,
        startTime: avail.start_time,
        reason: "checkout_expired",
        retryUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/student`,
      });
    }
  } catch (notifyErr) {
    console.error("[webhook] checkout expired notification failed:", notifyErr);
  }
}

/**
 * payment_intent.payment_failed
 * → unlock slot, send failure email with retry link.
 */
async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  // Resolve the availability from the PaymentIntent metadata (set in checkout creation)
  const availabilityId =
    pi.metadata?.availability_id ?? pi.metadata?.availabilityId;
  const studentId =
    pi.metadata?.student_id ?? pi.metadata?.studentId;

  if (availabilityId) {
    await unlockSlot(availabilityId);
    console.log(`[webhook] slot unlocked (payment_failed): availability=${availabilityId}`);
  }

  // Send failure email
  try {
    if (!studentId) return;
    const admin = createAdminClient();
    const { data: studentAuth } = await admin.auth.admin.getUserById(studentId);
    const studentEmail = studentAuth?.user?.email;
    const avail = availabilityId
      ? await fetchAvailabilityDetails(availabilityId)
      : null;

    if (studentEmail) {
      void sendPaymentFailedEmail(studentEmail, {
        course: avail?.course ?? "your session",
        startTime: avail?.start_time ?? "",
        reason: pi.last_payment_error?.message ?? "payment_failed",
        retryUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/student`,
      });
    }
  } catch (emailErr) {
    console.error("[webhook] payment failed notification failed:", emailErr);
  }
}

/**
 * charge.refunded / refund.updated
 * → update session status, notify both parties.
 */
async function handleRefund(
  charge: Stripe.Charge | null,
  refund: Stripe.Refund | null
) {
  const paymentIntentId =
    typeof charge?.payment_intent === "string"
      ? charge.payment_intent
      : (charge?.payment_intent as Stripe.PaymentIntent | undefined)?.id ?? null;

  if (!paymentIntentId) {
    console.warn("[webhook] refund event: no payment_intent_id");
    return;
  }

  const admin = createAdminClient();

  // Find the session_request by payment_intent_id
  const { data: sessionRequest } = await admin
    .from("session_requests")
    .select("id, student_id, tutor_id, availability_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!sessionRequest) {
    console.log(`[webhook] refund: no session_request found for pi=${paymentIntentId}`);
    return;
  }

  // Update refund ID on session_request
  if (refund?.id) {
    await admin
      .from("session_requests")
      .update({ stripe_refund_id: refund.id })
      .eq("id", sessionRequest.id);
  }

  // Notify both parties
  try {
    const avail = sessionRequest.availability_id
      ? await fetchAvailabilityDetails(sessionRequest.availability_id)
      : null;

    const { studentEmail, studentName, tutorName } =
      await resolveParticipants(
        sessionRequest.student_id,
        sessionRequest.tutor_id
      );

    const refundAmountCents = refund?.amount ?? charge?.amount_refunded ?? null;

    if (studentEmail && avail) {
      void sendRefundIssuedEmail(studentEmail, {
        course: avail.course,
        startTime: avail.start_time,
        refundCents: refundAmountCents,
        studentName,
        tutorName,
      });
    }
  } catch (emailErr) {
    console.error("[webhook] refund notification failed:", emailErr);
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const webhookSecret = getStripeWebhookSecret();
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    reportStripeWebhookMissingSignature();
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    captureStripeWebhookError("verify", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  try {
    const alreadyProcessed = await markEventProcessed(event.id, event.type);
    if (alreadyProcessed) {
      console.log(`[webhook] duplicate event skipped: ${event.id} (${event.type})`);
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (logErr) {
    // stripe_webhook_log table may not exist yet — non-fatal, continue processing
    console.warn("[webhook] idempotency log failed (non-fatal):", logErr);
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "checkout.session.expired": {
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "payment_intent.payment_failed": {
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        // Use the most recent refund object from the charge
        const latestRefund = charge.refunds?.data?.[0] ?? null;
        await handleRefund(charge, latestRefund);
        break;
      }

      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;
        // Fetch the charge separately if needed
        let charge: Stripe.Charge | null = null;
        if (typeof refund.charge === "string") {
          try {
            charge = await stripe.charges.retrieve(refund.charge);
          } catch {
            // Non-critical
          }
        } else if (refund.charge && typeof refund.charge === "object") {
          charge = refund.charge as Stripe.Charge;
        }
        await handleRefund(charge, refund);
        break;
      }

      default:
        console.log(`[webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[webhook] handler error for ${event.type}:`, err);
    captureUnexpectedError(`stripe-webhook-${event.type}`, err);
    // Return 200 so Stripe doesn't retry — we've logged the error
    return NextResponse.json({ received: true, error: "Handler failed, logged" });
  }

  return NextResponse.json({ received: true });
}

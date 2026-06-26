import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeWebhookSecret } from "@/shared/core/env";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { getSiteUrl } from "@/shared/core/site";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { bookSessionAsUser } from "@/features/booking/book-session";
import {
  captureStripeWebhookError,
  reportStripeWebhookMissingMetadata,
  reportStripeWebhookMissingSignature,
  captureUnexpectedError,
} from "@/shared/integrations/observability";
import { applyStripeAccountWebhookUpdate } from "@/features/payments/connect-onboarding";
import {
  sendSessionBookedEmail,
  sendPaymentFailedEmail,
  sendRefundIssuedEmail,
  type SessionEmailDetails,
} from "@/shared/integrations/email";
import { checkInstitutionCredits, consumeInstitutionCredit } from "@/features/institutions/institution-credits";
import { recordSecurityEvent } from "@/shared/core/security/security-events";
import {
  handleMomentumSubscriptionCheckoutCompleted,
  handleStripeSubscriptionDeleted,
  handleStripeSubscriptionUpdated,
} from "@/features/payments/subscription-webhook-handlers";

function stripe(): Stripe {
  return getStripeServer();
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stripe_webhook_log")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function logWebhook(
  eventId: string,
  eventType: string,
  status: "processed" | "failed",
  errorMessage?: string,
): Promise<void> {
  if (status === "processed") {
    const admin = createAdminClient();
    const { error } = await admin
      .from("stripe_webhook_log")
      .insert({ event_id: eventId, event_type: eventType });
    if (error && error.code !== "23505") throw error;
    return;
  }

  await recordSecurityEvent({
    event_type: "stripe_webhook_failed",
    metadata: {
      event_id: eventId,
      event_type: eventType,
      error: errorMessage?.slice(0, 500) ?? "unknown",
    },
  });
}

async function unlockSlot(availabilityId: string) {
  const admin = createAdminClient();
  await admin
    .from("availability")
    .update({
      booking_status: "available",
      locked_until: null,
      locked_by: null,
      stripe_checkout_session_id: null,
    })
    .eq("id", availabilityId)
    .eq("booking_status", "pending_payment");
}

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

async function fetchAvailabilityDetails(availabilityId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("availability")
    .select("course, start_time, end_time, tutor_id, price_per_session")
    .eq("id", availabilityId)
    .maybeSingle();
  return data;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.metadata?.checkout_kind === "momentum_subscription") {
    await handleMomentumSubscriptionCheckoutCompleted(session);
    return;
  }

  const availabilityId =
    session.metadata?.availability_id ?? session.metadata?.availabilityId;
  const studentId =
    session.metadata?.student_id ?? session.metadata?.studentId;
  const tutorId =
    session.metadata?.tutor_id ?? session.metadata?.tutorId;
  const isSmokeTest = session.metadata?.smoke_test === "true";

  if (!availabilityId || !studentId) {
    reportStripeWebhookMissingMetadata(session.id);
    console.error("[webhook] checkout.session.completed: missing metadata", session.id);
    throw new Error("checkout.session.completed missing required metadata");
  }

  if (isSmokeTest) {
    await markSlotBooked(availabilityId, session.id);
  }

  let sendCheckoutConfirmationEmail = false;
  try {
    await bookSessionAsUser(availabilityId, studentId, {
      stripeCheckoutSessionId: session.id,
      skipStripeVerification: isSmokeTest,
    });
    sendCheckoutConfirmationEmail = true;
    console.log(`[webhook] booking created: availability=${availabilityId} student=${studentId}`);

    try {
      const creditCheck = await checkInstitutionCredits(studentId);
      if (creditCheck.isMember && creditCheck.hasCredits && creditCheck.institutionId) {
        const consumed = await consumeInstitutionCredit(creditCheck.institutionId);
        if (consumed) {
          console.log(`[webhook] institution credit consumed: institution=${creditCheck.institutionId} student=${studentId}`);
        }
      }
    } catch (creditErr) {
      captureUnexpectedError("institution-credit-webhook", creditErr, { studentId, availabilityId });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("another learner")) {
      console.log(`[webhook] stale checkout payer refunded: session=${session.id}`);
      return;
    }
    const isIdempotent =
      msg.includes("already have") || msg.includes("pending request");
    if (isIdempotent) {
      console.log(`[webhook] idempotent: checkout ${session.id} already booked`);
      sendCheckoutConfirmationEmail = true;
    } else {
      captureStripeWebhookError("booking", err, { availabilityId, studentId });
      console.error("[webhook] bookSessionAsUser failed:", err);
      throw err instanceof Error ? err : new Error("bookSessionAsUser failed");
    }
  }

  if (!sendCheckoutConfirmationEmail) {
    return;
  }

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
        retryUrl: `${getSiteUrl()}/student`,
      });
    }
  } catch (notifyErr) {
    console.error("[webhook] checkout expired notification failed:", notifyErr);
  }
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const availabilityId =
    pi.metadata?.availability_id ?? pi.metadata?.availabilityId;
  const studentId =
    pi.metadata?.student_id ?? pi.metadata?.studentId;

  if (availabilityId) {
    await unlockSlot(availabilityId);
    console.log(`[webhook] slot unlocked (payment_failed): availability=${availabilityId}`);
  }

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
        retryUrl: `${getSiteUrl()}/student`,
      });
    }
  } catch (emailErr) {
    console.error("[webhook] payment failed notification failed:", emailErr);
  }
}

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

  const { data: sessionRequest } = await admin
    .from("session_requests")
    .select("id, student_id, tutor_id, availability_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!sessionRequest) {
    console.log(`[webhook] refund: no session_request found for pi=${paymentIntentId}`);
    return;
  }

  if (refund?.id) {
    await admin
      .from("session_requests")
      .update({ stripe_refund_id: refund.id })
      .eq("id", sessionRequest.id);
  }

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
    event = stripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    captureStripeWebhookError("verify", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    const alreadyProcessed = await isEventProcessed(event.id);
    if (alreadyProcessed) {
      console.log(`[webhook] duplicate event skipped: ${event.id} (${event.type})`);
      return NextResponse.json({ received: true, duplicate: true });
    }

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
        const latestRefund = charge.refunds?.data?.[0] ?? null;
        await handleRefund(charge, latestRefund);
        break;
      }

      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;
        let charge: Stripe.Charge | null = null;
        if (typeof refund.charge === "string") {
          try {
            charge = await stripe().charges.retrieve(refund.charge);
          } catch {
            // Non-critical
          }
        } else if (refund.charge && typeof refund.charge === "object") {
          charge = refund.charge as Stripe.Charge;
        }
        await handleRefund(charge, refund);
        break;
      }

      case "account.updated": {
        await applyStripeAccountWebhookUpdate(event.data.object as Stripe.Account);
        break;
      }

      case "customer.subscription.updated": {
        await handleStripeSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        await handleStripeSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }

      default:
        console.log(`[webhook] unhandled event type: ${event.type}`);
    }

    await logWebhook(event.id, event.type, "processed");
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] handler error for ${event.type}:`, err);
    captureUnexpectedError(`stripe-webhook-${event.type}`, err);
    await logWebhook(event.id, event.type, "failed", message);
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 },
    );
  }
}

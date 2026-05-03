import Stripe from "stripe";
import { getStripeServer } from "@/lib/stripe-server";

/**
 * Resolve PaymentIntent id from a completed Checkout Session and verify metadata matches the booking.
 */
export async function getVerifiedPaymentIntentForBooking(
  checkoutSessionId: string,
  expected: { availabilityId: string; studentId: string }
): Promise<{
  checkoutSessionId: string;
  paymentIntentId: string | null;
  /** Connect destination charge: tutor net settled on charge (no separate Transfer). */
  destinationCharge: boolean;
}> {
  const stripe = getStripeServer();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

  if (session.payment_status !== "paid") {
    throw new Error("Checkout session is not paid");
  }

  const aid =
    session.metadata?.availability_id ?? session.metadata?.availabilityId;
  const sid = session.metadata?.student_id ?? session.metadata?.studentId;
  if (aid !== expected.availabilityId || sid !== expected.studentId) {
    throw new Error("Checkout session does not match this booking");
  }

  const pi = session.payment_intent;
  let paymentIntentId: string | null = null;
  if (typeof pi === "string") {
    paymentIntentId = pi;
  } else if (pi && typeof pi === "object" && "id" in pi) {
    paymentIntentId = (pi as { id: string }).id;
  }

  const destinationCharge = session.metadata?.connect_destination === "true";

  return {
    checkoutSessionId: session.id,
    paymentIntentId,
    destinationCharge,
  };
}

/**
 * Full refund when a paid Checkout no longer maps to the winning slot lock (late payer).
 * Idempotent per checkout session id.
 */
export async function refundPaidCheckoutSession(checkoutSessionId: string): Promise<void> {
  const stripe = getStripeServer();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  if (session.payment_status !== "paid") {
    return;
  }
  const pi = session.payment_intent;
  const paymentIntentId =
    typeof pi === "string"
      ? pi
      : pi && typeof pi === "object" && "id" in pi
        ? (pi as Stripe.PaymentIntent).id
        : null;
  if (!paymentIntentId) {
    return;
  }

  await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
    },
    { idempotencyKey: `checkout_auto_refund_${checkoutSessionId}` }
  );
}

/**
 * Full refund for a rejected session request (idempotent per request id).
 */
export async function createRefundForRejectedRequest(
  paymentIntentId: string,
  requestId: string
): Promise<Stripe.Refund> {
  const stripe = getStripeServer();
  return stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
    },
    { idempotencyKey: `session_request_reject_${requestId}` }
  );
}

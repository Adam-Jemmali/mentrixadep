import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeSecretKey, getStripeWebhookSecret } from "@/lib/env";
import { bookSessionAsUser } from "@/app/actions/student";
import {
  captureStripeWebhookError,
  reportStripeWebhookMissingMetadata,
  reportStripeWebhookMissingSignature,
} from "@/lib/observability";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(getStripeSecretKey());
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
    console.error("[stripe/webhook] signature verification failed:", err);
    captureStripeWebhookError("verify", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const availabilityId = session.metadata?.availabilityId;
    const studentId = session.metadata?.studentId;

    if (!availabilityId || !studentId) {
      console.error(
        "[stripe/webhook] missing metadata in checkout session:",
        session.id
      );
      reportStripeWebhookMissingMetadata(session.id);
      return NextResponse.json(
        { error: "Missing metadata" },
        { status: 400 }
      );
    }

    try {
      await bookSessionAsUser(availabilityId, studentId);
      console.log(
        `[stripe/webhook] booking created for availability ${availabilityId} / student ${studentId}`
      );
    } catch (err) {
      console.error("[stripe/webhook] bookSessionAsUser failed:", err);
      captureStripeWebhookError("booking", err, {
        availabilityId,
        studentId,
      });
    }
  }

  return NextResponse.json({ received: true });
}

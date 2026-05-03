import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";
import { releaseAvailabilityPendingPaymentForCheckoutSession } from "@/lib/stripe-booking-sync";

function redirectToStudentCancelled(req: NextRequest) {
  const url = new URL("/student", req.url);
  url.searchParams.set("booking", "cancelled");
  return NextResponse.redirect(url);
}

/**
 * Stripe Checkout `cancel_url`. Releases the tutor slot from `pending_payment` immediately so
 * browse & book shows it again for other learners (natural expiry can take up to the session TTL).
 */
export async function GET(req: NextRequest) {
  const checkoutSessionId = req.nextUrl.searchParams.get("session_id");
  if (!checkoutSessionId?.trim()) {
    return redirectToStudentCancelled(req);
  }

  try {
    const stripe = new Stripe(getStripeSecretKey());
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId.trim());

    if (session.payment_status === "paid") {
      return redirectToStudentCancelled(req);
    }

    const availabilityId =
      session.metadata?.availability_id ?? session.metadata?.availabilityId;
    if (!availabilityId) {
      return redirectToStudentCancelled(req);
    }

    await releaseAvailabilityPendingPaymentForCheckoutSession(
      availabilityId,
      checkoutSessionId.trim()
    );

    revalidatePath("/student");
    revalidatePath("/tutor");
  } catch (err) {
    console.error("[stripe/checkout/cancel-return]", err);
  }

  return redirectToStudentCancelled(req);
}

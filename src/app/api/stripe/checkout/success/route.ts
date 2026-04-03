import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";
import { bookSessionAsUser } from "@/app/actions/student";
import {
  getSessionRequestIdByStripeCheckout,
  hasBookingSyncedForCheckout,
} from "@/lib/stripe-booking-sync";
import { trackEvent } from "@/lib/analytics";

function redirectToConfirmed(req: NextRequest, requestId: string) {
  const url = new URL(`/student/booking/confirmed`, req.url);
  url.searchParams.set("request", requestId);
  return NextResponse.redirect(url);
}

function redirectToStudent(req: NextRequest, booking: string, reason?: string) {
  const url = new URL(`/student?booking=${booking}`, req.url);
  if (reason) url.searchParams.set("reason", reason);
  if (booking === "success") {
    url.hash = "sessions";
  }
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const checkoutSessionId = req.nextUrl.searchParams.get("session_id");
  if (!checkoutSessionId) {
    return redirectToStudent(req, "error", "missing_session_id");
  }

  try {
    const stripe = new Stripe(getStripeSecretKey());
    const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);

    if (checkoutSession.payment_status !== "paid") {
      return redirectToStudent(req, "error", "payment_not_completed");
    }

    const availabilityId =
      checkoutSession.metadata?.availability_id ??
      checkoutSession.metadata?.availabilityId;
    const studentId =
      checkoutSession.metadata?.student_id ?? checkoutSession.metadata?.studentId;
    const tutorId =
      checkoutSession.metadata?.tutor_id ?? checkoutSession.metadata?.tutorId;
    if (!availabilityId || !studentId) {
      return redirectToStudent(req, "error", "missing_metadata");
    }

    try {
      const result = await bookSessionAsUser(availabilityId, studentId, {
        stripeCheckoutSessionId: checkoutSession.id,
      });
      void trackEvent("checkout_completed", {
        userId: studentId,
        properties: {
          availability_id: availabilityId,
          amount_cents: checkoutSession.amount_total ?? 0,
        },
      });
      return redirectToConfirmed(req, result.request.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (
        err instanceof Error &&
        (msg.includes("pending request") || msg.includes("already have"))
      ) {
        const reqId = await getSessionRequestIdByStripeCheckout(checkoutSession.id);
        if (reqId) return redirectToConfirmed(req, reqId);
        return redirectToStudent(req, "success");
      }
      if (
        err instanceof Error &&
        (await hasBookingSyncedForCheckout(availabilityId, studentId, tutorId))
      ) {
        const reqId = await getSessionRequestIdByStripeCheckout(checkoutSession.id);
        if (reqId) return redirectToConfirmed(req, reqId);
        return redirectToStudent(req, "success");
      }
      throw err;
    }
  } catch (err) {
    console.error("[stripe/checkout/success] finalize booking failed:", err);
    return redirectToStudent(req, "error", "finalize_failed");
  }
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";
import { bookSessionAsUser } from "@/app/actions/student";
import { hasBookingSyncedForCheckout } from "@/lib/stripe-booking-sync";

function redirectToStudent(req: NextRequest, booking: string, reason?: string) {
  const url = new URL(`/student?booking=${booking}`, req.url);
  if (reason) url.searchParams.set("reason", reason);
  if (booking === "success") {
    url.hash = "sessions";
  }
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return redirectToStudent(req, "error", "missing_session_id");
  }

  try {
    const stripe = new Stripe(getStripeSecretKey());
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== "paid") {
      return redirectToStudent(req, "error", "payment_not_completed");
    }

    const availabilityId = checkoutSession.metadata?.availabilityId;
    const studentId = checkoutSession.metadata?.studentId;
    const tutorId = checkoutSession.metadata?.tutorId;
    if (!availabilityId || !studentId) {
      return redirectToStudent(req, "error", "missing_metadata");
    }

    try {
      await bookSessionAsUser(availabilityId, studentId);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (
        err instanceof Error &&
        (msg.includes("pending request") || msg.includes("already have"))
      ) {
        return redirectToStudent(req, "success");
      }
      if (
        err instanceof Error &&
        (await hasBookingSyncedForCheckout(availabilityId, studentId, tutorId))
      ) {
        return redirectToStudent(req, "success");
      }
      throw err;
    }

    return redirectToStudent(req, "success");
  } catch (err) {
    console.error("[stripe/checkout/success] finalize booking failed:", err);
    return redirectToStudent(req, "error", "finalize_failed");
  }
}

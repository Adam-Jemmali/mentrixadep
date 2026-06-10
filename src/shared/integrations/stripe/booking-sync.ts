import { createAdminClient } from "@/shared/integrations/supabase/admin";

export type PaidCheckoutClaimStatus = "claimed" | "already_booked_this_session";

/**
 * First paying customer wins: transition `pending_payment` → `booked` only when this Checkout
 * Session still holds the lock. Stale payers get `ok: false` and should be refunded.
 */
export async function claimAvailabilityForPaidCheckout(
  availabilityId: string,
  checkoutSessionId: string,
  studentId: string
): Promise<{ ok: true; status: PaidCheckoutClaimStatus } | { ok: false }> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("availability")
    .select("booking_status, stripe_checkout_session_id")
    .eq("id", availabilityId)
    .maybeSingle();

  if (!row) return { ok: false };

  const status = (row.booking_status as string | null) ?? "available";
  const rowSession = row.stripe_checkout_session_id as string | null;

  if (status === "booked" && rowSession === checkoutSessionId) {
    return { ok: true, status: "already_booked_this_session" };
  }
  if (status === "booked") {
    return { ok: false };
  }

  const { data: updated } = await admin
    .from("availability")
    .update({
      booking_status: "booked",
      locked_until: null,
      locked_by: null,
      stripe_checkout_session_id: checkoutSessionId,
    })
    .eq("id", availabilityId)
    .eq("booking_status", "pending_payment")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .eq("locked_by", studentId)
    .select("id")
    .maybeSingle();

  if (updated) {
    return { ok: true, status: "claimed" };
  }

  return { ok: false };
}

/**
 * Release a browse slot after Checkout is abandoned (cancel URL). Only affects rows still in
 * `pending_payment` that match this Stripe Checkout Session id — avoids clobbering paid bookings.
 */
export async function releaseAvailabilityPendingPaymentForCheckoutSession(
  availabilityId: string,
  checkoutSessionId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("availability")
    .update({
      booking_status: "available",
      locked_until: null,
      locked_by: null,
      stripe_checkout_session_id: null,
    })
    .eq("id", availabilityId)
    .eq("booking_status", "pending_payment")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .select("id")
    .maybeSingle();

  return !!data && !error;
}

export async function getSessionRequestIdByStripeCheckout(
  stripeCheckoutSessionId: string
): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("session_requests")
    .select("id")
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * After Stripe reports payment success, the webhook may finish before the
 * browser hits `/api/stripe/checkout/success`. If the tutor auto-approves,
 * `availability` can be deleted while `sessions` is created — a second
 * `bookSessionAsUser` then fails with "Availability not found". This helper
 * detects that the booking already synced so the success redirect can be idempotent.
 */
export async function hasBookingSyncedForCheckout(
  availabilityId: string,
  studentId: string,
  tutorId: string | undefined
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { data: existingReq } = await adminClient
    .from("session_requests")
    .select("id")
    .eq("student_id", studentId)
    .eq("availability_id", availabilityId)
    .in("status", ["pending", "approved"])
    .limit(1)
    .maybeSingle();

  if (existingReq) return true;

  if (!tutorId) return false;

  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recentSession } = await adminClient
    .from("sessions")
    .select("id")
    .eq("student_id", studentId)
    .eq("tutor_id", tutorId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return !!recentSession;
}

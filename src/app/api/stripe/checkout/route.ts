import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey } from "@/lib/env";
import { env } from "@/lib/env";
import { mentrixaCheckoutBrandingWithAssets } from "@/lib/stripe-checkout-copy";
import { splitSessionPriceCents } from "@/lib/booking-pricing";
import { captureUnexpectedError, withStripeApiSpan } from "@/lib/observability";
import { trackEvent } from "@/lib/analytics";
import {
  enforceSlidingRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/lib/security";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Slot lock duration matching Stripe Checkout session expiry. */
const SLOT_LOCK_MINUTES = 30;
/** Platform fee expressed as a percentage (15%). */
const PLATFORM_FEE_PERCENT = 15;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function platformFeeCents(sessionCents: number): number {
  return Math.round((sessionCents * PLATFORM_FEE_PERCENT) / 100);
}

function lockedUntilIso(): string {
  return new Date(Date.now() + SLOT_LOCK_MINUTES * 60_000).toISOString();
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { availabilityId?: string };
    const availabilityId = body.availabilityId?.trim();

    if (!availabilityId) {
      return NextResponse.json(
        { error: "availabilityId is required" },
        { status: 400 }
      );
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await enforceSlidingRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.stripeCheckout,
      "stripe.checkout",
    );

    const adminClient = createAdminClient();

    // ── Fetch availability (admin read — bypasses RLS) ────────────────────────
    const { data: availability, error: availError } = await adminClient
      .from("availability")
      .select(
        "id, course, start_time, end_time, tutor_id, price_per_session, active, booking_status, locked_until, locked_by"
      )
      .eq("id", availabilityId)
      .single();

    if (availError || !availability) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    // ── Availability checks ───────────────────────────────────────────────────
    if ((availability as { active?: boolean }).active === false) {
      return NextResponse.json(
        { error: "This slot is no longer accepting bookings" },
        { status: 400 }
      );
    }

    if (new Date(availability.start_time) <= new Date()) {
      return NextResponse.json(
        { error: "Cannot book a slot in the past" },
        { status: 400 }
      );
    }

    // ── Race-condition guard — check slot lock ────────────────────────────────
    const bookingStatus = (availability as { booking_status?: string }).booking_status ?? "available";
    const lockedUntilRaw = (availability as { locked_until?: string | null }).locked_until;
    const lockedBy = (availability as { locked_by?: string | null }).locked_by;

    if (bookingStatus === "booked") {
      return NextResponse.json(
        { error: "This slot has already been booked" },
        { status: 409 }
      );
    }

    if (bookingStatus === "pending_payment") {
      const lockExpiry = lockedUntilRaw ? new Date(lockedUntilRaw) : null;
      const lockExpired = !lockExpiry || lockExpiry <= new Date();

      if (!lockExpired) {
        // Allow the same student to reclaim their own lock
        if (lockedBy !== user.id) {
          return NextResponse.json(
            { error: "This slot is temporarily reserved by another learner. Try again in a few minutes." },
            { status: 409 }
          );
        }
      }
      // Lock is expired or owned by this student — we can overwrite it below
    }

    // ── Duplicate booking check ───────────────────────────────────────────────
    const { data: existingRequest } = await adminClient
      .from("session_requests")
      .select("id, status")
      .eq("student_id", user.id)
      .eq("availability_id", availabilityId)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existingRequest) {
      const message =
        existingRequest.status === "pending"
          ? "You already have a pending request for this slot."
          : "This slot is already confirmed for you.";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    // ── Lock the slot (atomic update with status guard) ───────────────────────
    // We only update if status is still 'available' or if our own expired lock.
    // This prevents a TOCTOU race between the check above and the lock below.
    const lockedUntil = lockedUntilIso();
    const { data: lockResult, error: lockError } = await adminClient
      .from("availability")
      .update({
        booking_status: "pending_payment",
        locked_until: lockedUntil,
        locked_by: user.id,
      })
      .eq("id", availabilityId)
      // Only lock if available, OR if the lock is ours / expired
      .or(
        `booking_status.eq.available,and(booking_status.eq.pending_payment,locked_by.eq.${user.id}),and(booking_status.eq.pending_payment,locked_until.lt.${new Date().toISOString()})`
      )
      .select("id")
      .maybeSingle();

    if (lockError || !lockResult) {
      // Slot was grabbed by another concurrent checkout
      return NextResponse.json(
        { error: "This slot was just taken by another learner. Please choose a different time." },
        { status: 409 }
      );
    }

    // ── Fetch tutor name for line item copy ───────────────────────────────────
    let tutorName = "your Guide";
    try {
      const { data: tutorUser } = await adminClient.auth.admin.getUserById(
        availability.tutor_id
      );
      const settings = await adminClient
        .from("user_settings")
        .select("display_name")
        .eq("user_id", availability.tutor_id)
        .maybeSingle();
      tutorName =
        settings.data?.display_name?.trim() ||
        tutorUser.user?.email?.split("@")[0] ||
        "your Guide";
    } catch {
      // Non-critical — use fallback
    }

    // ── Pricing ───────────────────────────────────────────────────────────────
    const sessionPriceCents: number = availability.price_per_session ?? 2500;
    const split = splitSessionPriceCents(sessionPriceCents);
    const appFeeAmount = platformFeeCents(sessionPriceCents);

    const appUrl = env.public.appUrl ?? "http://localhost:3000";
    const branding = mentrixaCheckoutBrandingWithAssets(appUrl);
    const stripe = new Stripe(getStripeSecretKey());

    // ── Build line items ──────────────────────────────────────────────────────
    const sessionDate = new Date(availability.start_time).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const sessionTime = new Date(availability.start_time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [
      {
        price_data: {
          currency: "usd",
          unit_amount: sessionPriceCents,
          product_data: {
            name: `${availability.course} tutoring session`,
            description: `${sessionDate} at ${sessionTime} with ${tutorName}`,
            metadata: {
              tutor_name: tutorName,
              course: availability.course,
            },
          },
        },
        quantity: 1,
      },
    ];

    if (split.platformFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: split.platformFeeCents,
          product_data: {
            name: "Mentrixa platform fee",
            description: `${PLATFORM_FEE_PERCENT}% service fee`,
          },
        },
        quantity: 1,
      });
    }

    // ── Create Stripe Checkout session ────────────────────────────────────────
    const checkoutMetadata = {
      tutor_id: availability.tutor_id,
      student_id: user.id,
      availability_id: availability.id,
      course: availability.course,
      session_date: availability.start_time,
      platform_fee_cents: String(appFeeAmount),
      // Legacy aliases for backward-compat with existing webhook handlers
      availabilityId: availability.id,
      studentId: user.id,
      tutorId: availability.tutor_id,
    };

    const idempotencyKey = `checkout_${availability.id}_${user.id}`;

    const session = await withStripeApiSpan("checkout.sessions.create", () =>
      stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          line_items: lineItems,
          branding_settings: branding,
          expires_at: Math.floor(Date.now() / 1000) + SLOT_LOCK_MINUTES * 60,
          custom_text: {
            submit: {
              message:
                "Secure payment via Stripe. You'll return to Mentrixa after paying. If your Guide declines, your payment is refunded automatically.",
            },
          },
          metadata: checkoutMetadata,
          payment_intent_data: {
            // Application fee goes to Mentrixa platform account
            // Requires Stripe Connect — omit application_fee_amount if not on Connect
            metadata: checkoutMetadata,
          },
          success_url: `${appUrl}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/student?booking=cancelled`,
        },
        { idempotencyKey },
      ),
    );

    // ── Store checkout session ID on the slot for webhook reconciliation ──────
    await adminClient
      .from("availability")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", availabilityId);

    void trackEvent("checkout_started", {
      userId: user.id,
      properties: { availability_id: availabilityId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] error:", err);
    captureUnexpectedError("stripe-checkout-create", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

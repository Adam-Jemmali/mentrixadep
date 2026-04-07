import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey, env } from "@/lib/env";
import { mentrixaCheckoutBrandingWithAssets } from "@/lib/stripe-checkout-copy";
import { splitSessionPriceCents } from "@/lib/booking-pricing";
import { captureUnexpectedError, withStripeApiSpan } from "@/lib/observability";
import { trackEvent } from "@/lib/analytics";
import {
  enforceSlidingRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/lib/security";

const SLOT_LOCK_MINUTES = 30;

function lockedUntilIso(): string {
  return new Date(Date.now() + SLOT_LOCK_MINUTES * 60_000).toISOString();
}

function isOpenUnpaidCheckout(session: Stripe.Checkout.Session): boolean {
  return session.status === "open" && session.payment_status !== "paid";
}

function normalizeHttpOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const isLocalHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";
    if (isLocalHost && parsed.protocol === "https:") {
      return `http://${parsed.host}`;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function resolveAppOrigin(req: NextRequest): string {
  const fromEnv = normalizeHttpOrigin(env.public.appUrl);
  if (fromEnv) {
    return fromEnv;
  }

  const fromRequest = normalizeHttpOrigin(req.nextUrl.origin);
  if (fromRequest) {
    return fromRequest;
  }

  return "http://localhost:3000";
}

type SlotLockState =
  | { action: "proceed" }
  | { action: "conflict" }
  | { action: "resume_checkout"; url: string };

type ClearPendingLockOptions = {
  lockedBy?: string;
};

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
      "stripe.checkout"
    );

    const adminClient = createAdminClient();
    const stripe = new Stripe(getStripeSecretKey());

    const { data: availability, error: availError } = await adminClient
      .from("availability")
      .select(
        "id, course, start_time, end_time, tutor_id, price_per_session, active, booking_status, locked_until, locked_by, stripe_checkout_session_id"
      )
      .eq("id", availabilityId)
      .single();

    if (availError || !availability) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

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

    async function clearPendingLock(options?: ClearPendingLockOptions) {
      let query = adminClient
        .from("availability")
        .update({
          booking_status: "available",
          locked_until: null,
          locked_by: null,
          stripe_checkout_session_id: null,
        })
        .eq("id", availabilityId)
        .eq("booking_status", "pending_payment");

      if (options?.lockedBy) {
        query = query.eq("locked_by", options.lockedBy);
      }

      await query;
    }

    async function acquireSlotLock(userId: string, untilIso: string): Promise<boolean> {
      const lockPayload = {
        booking_status: "pending_payment",
        locked_until: untilIso,
        locked_by: userId,
        stripe_checkout_session_id: null,
      };

      const rpcResult = await adminClient.rpc(
        "acquire_availability_checkout_lock",
        {
          p_availability_id: availabilityId,
          p_user_id: userId,
          p_locked_until: untilIso,
        }
      );

      if (!rpcResult.error) {
        return rpcResult.data === true;
      }

      // Fallback path for environments where the migration has not been applied yet.
      const { data: availableLock } = await adminClient
        .from("availability")
        .update(lockPayload)
        .eq("id", availabilityId)
        .or("booking_status.eq.available,booking_status.is.null")
        .select("id")
        .maybeSingle();
      if (availableLock) {
        return true;
      }

      const { data: ownLock } = await adminClient
        .from("availability")
        .update(lockPayload)
        .eq("id", availabilityId)
        .eq("booking_status", "pending_payment")
        .eq("locked_by", userId)
        .select("id")
        .maybeSingle();
      if (ownLock) {
        return true;
      }

      const nowIso = new Date().toISOString();
      const { data: expiredTimedLock } = await adminClient
        .from("availability")
        .update(lockPayload)
        .eq("id", availabilityId)
        .eq("booking_status", "pending_payment")
        .lte("locked_until", nowIso)
        .select("id")
        .maybeSingle();
      if (expiredTimedLock) {
        return true;
      }

      const { data: expiredNullLock } = await adminClient
        .from("availability")
        .update(lockPayload)
        .eq("id", availabilityId)
        .eq("booking_status", "pending_payment")
        .is("locked_until", null)
        .select("id")
        .maybeSingle();

      return !!expiredNullLock;
    }

    async function inspectSlotLock(
      $availability: typeof availability,
      userId: string
    ): Promise<SlotLockState> {
      const bookingStatus =
        ($availability as { booking_status?: string | null }).booking_status ??
        "available";
      const lockedUntilRaw =
        ($availability as { locked_until?: string | null }).locked_until;
      const lockedBy = ($availability as { locked_by?: string | null }).locked_by;
      const checkoutSessionId =
        ($availability as { stripe_checkout_session_id?: string | null })
          .stripe_checkout_session_id ?? null;

      if (bookingStatus === "booked") {
        return { action: "conflict" };
      }

      if (bookingStatus !== "pending_payment") {
        return { action: "proceed" };
      }

      let checkoutSession: Stripe.Checkout.Session | null = null;
      if (checkoutSessionId) {
        try {
          checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
        } catch {
          checkoutSession = null;
        }
      }

      const hasActiveStripeCheckout =
        checkoutSession ? isOpenUnpaidCheckout(checkoutSession) : false;
      const lockExpired =
        !lockedUntilRaw || new Date(lockedUntilRaw) <= new Date();

      if (lockedBy === userId && hasActiveStripeCheckout) {
        if (checkoutSession?.url) {
          return { action: "resume_checkout", url: checkoutSession.url };
        }
        await clearPendingLock({ lockedBy: userId });
        return { action: "proceed" };
      }

      if (lockedBy === userId) {
        await clearPendingLock({ lockedBy: userId });
        return { action: "proceed" };
      }

      if (lockExpired) {
        await clearPendingLock();
        return { action: "proceed" };
      }

      if (checkoutSessionId && !hasActiveStripeCheckout) {
        await clearPendingLock();
        return { action: "proceed" };
      }

      return { action: "conflict" };
    }

    const lockState = await inspectSlotLock(availability, user.id);

    if (lockState.action === "resume_checkout") {
      return NextResponse.json({ url: lockState.url });
    }

    if (lockState.action === "conflict") {
      return NextResponse.json(
        {
          error:
            "This slot was just taken by another learner. Please choose a different time.",
        },
        { status: 409 }
      );
    }

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

    const lockedUntil = lockedUntilIso();

    const lockAcquired = await acquireSlotLock(user.id, lockedUntil);

    if (!lockAcquired) {
      const { data: latestAvailability } = await adminClient
        .from("availability")
        .select(
          "id, course, start_time, end_time, tutor_id, price_per_session, active, booking_status, locked_until, locked_by, stripe_checkout_session_id"
        )
        .eq("id", availabilityId)
        .maybeSingle();

      if (latestAvailability) {
        const latestLockState = await inspectSlotLock(latestAvailability, user.id);
        if (latestLockState.action === "resume_checkout") {
          return NextResponse.json({ url: latestLockState.url });
        }
      }

      return NextResponse.json(
        {
          error:
            "This slot was just taken by another learner. Please choose a different time.",
        },
        { status: 409 }
      );
    }

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
      // Non-critical fallback.
    }

    const sessionPriceCents: number = availability.price_per_session ?? 2500;
    const split = splitSessionPriceCents(sessionPriceCents);
    const appFeeAmount = split.platformFeeCents;

    const { data: tutorStripe, error: tutorStripeErr } = await adminClient
      .from("users")
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("id", availability.tutor_id)
      .maybeSingle();

    if (tutorStripeErr) {
      await clearPendingLock({ lockedBy: user.id });
      return NextResponse.json(
        { error: "Could not verify this guide's payout account. Try again later." },
        { status: 500 }
      );
    }

    if (!tutorStripe?.stripe_account_id || !tutorStripe.stripe_payouts_enabled) {
      await clearPendingLock({ lockedBy: user.id });
      return NextResponse.json(
        {
          error:
            "This guide has not finished Stripe payout setup yet. Bookings are unavailable until they complete Setup payments on their dashboard.",
        },
        { status: 400 }
      );
    }

    const appOrigin = resolveAppOrigin(req);
    const branding = mentrixaCheckoutBrandingWithAssets(appOrigin);
    const successUrl = `${appOrigin}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appOrigin}/student?booking=cancelled`;

    const sessionDate = new Date(availability.start_time).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      }
    );
    const sessionTime = new Date(availability.start_time).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    );

    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [
      {
        price_data: {
          currency: "usd",
          // Model A: charge learner only the base session amount.
          unit_amount: split.totalCents,
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

    const checkoutMetadata = {
      tutor_id: availability.tutor_id,
      student_id: user.id,
      availability_id: availability.id,
      course: availability.course,
      session_date: availability.start_time,
      platform_fee_cents: String(appFeeAmount),
      availabilityId: availability.id,
      studentId: user.id,
      tutorId: availability.tutor_id,
      /** Reconciled in webhook + bookSessionAsUser for ledger (Connect destination charge). */
      connect_destination: "true",
    };

    const idempotencyKey = `checkout_${availability.id}_${user.id}`;

    let session: Stripe.Checkout.Session;
    try {
      session = await withStripeApiSpan("checkout.sessions.create", () =>
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
              application_fee_amount: appFeeAmount,
              transfer_data: {
                destination: tutorStripe.stripe_account_id,
              },
              metadata: checkoutMetadata,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
          },
          { idempotencyKey }
        )
      );
    } catch (stripeErr) {
      await adminClient
        .from("availability")
        .update({
          booking_status: "available",
          locked_until: null,
          locked_by: null,
          stripe_checkout_session_id: null,
        })
        .eq("id", availabilityId)
        .eq("booking_status", "pending_payment")
        .eq("locked_by", user.id);
      throw stripeErr;
    }

    await adminClient
      .from("availability")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", availabilityId)
      .eq("locked_by", user.id);

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

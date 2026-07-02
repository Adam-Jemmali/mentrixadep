import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { getSiteUrl } from "@/shared/core/site";
import { mentrixaCheckoutBrandingWithAssets } from "@/shared/integrations/stripe/checkout-copy";
import { getStudentSessionCheckoutCents, splitSessionPriceCents } from "@/features/booking/booking-pricing";
import { bookSessionAsUser } from "@/features/booking/book-session";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import {
  consumeMomentumSessionCredit,
  linkMomentumCreditRedemptionToSessionRequest,
  restoreMomentumSessionCredit,
} from "@/features/entitlements/session-credits";
import { captureUnexpectedError, withStripeApiSpan } from "@/shared/integrations/observability";
import { trackEvent } from "@/shared/integrations/analytics";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  const fromEnv = normalizeHttpOrigin(getSiteUrl());
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL");
  }

  const fromRequest = normalizeHttpOrigin(req.nextUrl.origin);
  if (fromRequest) {
    return fromRequest;
  }

  return normalizeHttpOrigin(getSiteUrl()) ?? req.nextUrl.origin;
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
    const body = (await req.json()) as {
      availabilityId?: string;
      /** When false, member pays the reduced session rate instead of using an included credit. */
      useSessionCredit?: boolean;
    };
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

    const rateBlocked = await enforceApiRouteRateLimit("stripe.checkout", {
      userId: user.id,
    });
    if (rateBlocked) return rateBlocked;

    const adminClient = createAdminClient();
    const stripe = getStripeServer();

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
            "Another learner is checking out this slot or already booked it. Please choose a different time.",
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
            "Another learner is checking out this slot or already booked it. Please choose a different time.",
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

    const subscription = await getStudentEntitlements(user.id);
    const momentumSubscriber = subscription.momentumActive;
    const useSessionCredit = body.useSessionCredit !== false;
    const appOrigin = resolveAppOrigin(req);

    if (useSessionCredit && subscription.sessionCreditsRemaining > 0) {
      const consumed = await consumeMomentumSessionCredit({
        userId: user.id,
        availabilityId,
      });

      if (consumed.ok) {
        try {
          const result = await bookSessionAsUser(availabilityId, user.id);
          await adminClient
            .from("availability")
            .update({
              booking_status: "booked",
              locked_until: null,
              locked_by: null,
              stripe_checkout_session_id: null,
            })
            .eq("id", availabilityId);

          const requestId =
            result.request && typeof result.request.id === "string"
              ? result.request.id
              : null;
          if (requestId) {
            await linkMomentumCreditRedemptionToSessionRequest({
              userId: user.id,
              availabilityId,
              sessionRequestId: requestId,
            });
          }

          void trackEvent("checkout_completed", {
            userId: user.id,
            properties: {
              availability_id: availabilityId,
              amount_cents: 0,
              momentum_session_credit: true,
            },
          });

          const successUrl = new URL("/student", appOrigin);
          successUrl.searchParams.set("booking", "success");
          successUrl.searchParams.set("reason", "approved");
          successUrl.searchParams.set("credit", "1");
          successUrl.searchParams.set("sessionsTab", "upcoming");
          successUrl.hash = "sessions-history";

          return NextResponse.json({ url: successUrl.toString() });
        } catch (bookErr) {
          if (!consumed.alreadyRedeemed) {
            await restoreMomentumSessionCredit({
              userId: user.id,
              availabilityId,
            });
          }
          await clearPendingLock({ lockedBy: user.id });
          const msg = bookErr instanceof Error ? bookErr.message : "Booking failed";
          return NextResponse.json({ error: msg }, { status: 409 });
        }
      }
    }

    const sessionPriceCents = getStudentSessionCheckoutCents({ momentumSubscriber });
    const split = splitSessionPriceCents(sessionPriceCents);

    const branding = mentrixaCheckoutBrandingWithAssets(appOrigin);
    const successUrl = `${appOrigin}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appOrigin}/api/stripe/checkout/cancel-return?session_id={CHECKOUT_SESSION_ID}`;

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

    // Student pays Mentrixa directly — no Stripe Connect destination charge.
    // The full session price goes to the platform Stripe account.
    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [
      {
        price_data: {
          currency: "cad",
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
      platform_fee_cents: String(split.platformFeeCents),
      availabilityId: availability.id,
      studentId: user.id,
      tutorId: availability.tutor_id,
    };

    // Unique per attempt so cancel-and-retry or parameter changes never collide with Stripe idempotency.
    const idempotencyKey = `checkout_${availability.id}_${user.id}_${randomUUID()}`;

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
              // Direct charge to Mentrixa — no Connect transfer.
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
    let message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("Keys for idempotent requests")) {
      message =
        "Checkout could not be started because an earlier attempt is still processing. Please wait a moment and try again.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

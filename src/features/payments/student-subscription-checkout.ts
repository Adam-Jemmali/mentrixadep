import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createClient } from "@/shared/integrations/supabase/server";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { getSiteUrl } from "@/shared/core/site";
import { mentrixaCheckoutBrandingWithAssets } from "@/shared/integrations/stripe/checkout-copy";
import {
  getMomentumSubscriptionCents,
  MOMENTUM_SUBSCRIPTION_ANNUAL_CENTS,
  MOMENTUM_SUBSCRIPTION_MONTHLY_CENTS,
} from "@/features/booking/booking-pricing";
import { subscriptionBillingIntervalSchema } from "@/features/payments/student-subscription";
import { assertNoActiveMomentumSubscription } from "@/features/payments/cancel-momentum-subscription";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";
import { captureUnexpectedError, withStripeApiSpan } from "@/shared/integrations/observability";

export const runtime = "nodejs";

const bodySchema = z.object({
  interval: subscriptionBillingIntervalSchema.default("annual"),
});

function subscriptionLineItem(interval: z.infer<typeof subscriptionBillingIntervalSchema>): Stripe.Checkout.SessionCreateParams.LineItem {
  const isAnnual = interval === "annual";
  return {
    price_data: {
      currency: "cad",
      product_data: {
        name: isAnnual ? "Momentum annual" : "Momentum monthly",
        description: isAnnual
          ? "Priority retests, grid history, progress archive, one included Guide session per month"
          : "Momentum monthly subscription",
      },
      unit_amount: getMomentumSubscriptionCents(interval),
      recurring: {
        interval: isAnnual ? "year" : "month",
      },
    },
    quantity: 1,
  };
}

export function buildMomentumSubscriptionCheckoutParams(params: {
  origin: string;
  userId: string;
  userEmail?: string | null;
  interval: z.infer<typeof subscriptionBillingIntervalSchema>;
}): Stripe.Checkout.SessionCreateParams {
  const { origin, userId, userEmail, interval } = params;
  const branding = mentrixaCheckoutBrandingWithAssets(origin);

  return {
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: userEmail ?? undefined,
    line_items: [subscriptionLineItem(interval)],
    branding_settings: branding,
    success_url: `${origin}/student/subscribe?success=1`,
    cancel_url: `${origin}/student/subscribe?canceled=1`,
    custom_text: {
      submit: {
        message:
          "Secure payment via Stripe. Momentum perks unlock as soon as your subscription is active.",
      },
    },
    metadata: {
      checkout_kind: "momentum_subscription",
      user_id: userId,
      billing_interval: interval,
      plan_tier: "momentum",
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        billing_interval: interval,
        plan_tier: "momentum",
      },
    },
  };
}

export async function POST(req: NextRequest) {
  try {
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

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const interval = parsed.data.interval;
    const alreadyActive = await assertNoActiveMomentumSubscription(user.id);
    if (alreadyActive) {
      return NextResponse.json({ error: alreadyActive }, { status: 409 });
    }

    const stripe = getStripeServer();
    const origin = getSiteUrl().replace(/\/$/, "");

    const session = await withStripeApiSpan("checkout.sessions.create.subscription", () =>
      stripe.checkout.sessions.create(buildMomentumSubscriptionCheckoutParams({
        origin,
        userId: user.id,
        userEmail: user.email,
        interval,
      }), {
        idempotencyKey: `momentum_sub_${user.id}_${interval}_${randomUUID()}`,
      }),
    );

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }

    return NextResponse.json({
      url: session.url,
      interval,
      amountCents:
        interval === "annual"
          ? MOMENTUM_SUBSCRIPTION_ANNUAL_CENTS
          : MOMENTUM_SUBSCRIPTION_MONTHLY_CENTS,
    });
  } catch (err) {
    captureUnexpectedError("stripe-subscription-checkout", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
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
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";

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
    const stripe = getStripeServer();
    const origin = getSiteUrl().replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [subscriptionLineItem(interval)],
      success_url: `${origin}/student/subscribe?success=1`,
      cancel_url: `${origin}/student/subscribe?canceled=1`,
      metadata: {
        checkout_kind: "momentum_subscription",
        user_id: user.id,
        billing_interval: interval,
        plan_tier: "momentum",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          billing_interval: interval,
          plan_tier: "momentum",
        },
      },
      ...mentrixaCheckoutBrandingWithAssets(origin),
    });

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
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

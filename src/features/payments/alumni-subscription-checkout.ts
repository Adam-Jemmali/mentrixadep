import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/integrations/supabase/server";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { getSiteUrl } from "@/shared/core/site";
import { mentrixaCheckoutBrandingWithAssets } from "@/shared/integrations/stripe/checkout-copy";
import { MOMENTUM_ALUMNI_ANNUAL_CENTS } from "@/features/booking/booking-pricing";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
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

    const stripe = getStripeServer();
    const origin = getSiteUrl().replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Alumni Momentum",
              description:
                "Trajectory archive read access and one included Guide session per quarter",
            },
            unit_amount: MOMENTUM_ALUMNI_ANNUAL_CENTS,
            recurring: { interval: "year" },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/student/subscribe?success=1&plan=alumni`,
      cancel_url: `${origin}/student/subscribe?canceled=1`,
      metadata: {
        checkout_kind: "momentum_alumni_subscription",
        user_id: user.id,
        billing_interval: "annual",
        plan_tier: "alumni",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          billing_interval: "annual",
          plan_tier: "alumni",
        },
      },
      ...mentrixaCheckoutBrandingWithAssets(origin),
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

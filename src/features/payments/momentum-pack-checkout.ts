import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/integrations/supabase/server";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { getSiteUrl } from "@/shared/core/site";
import { mentrixaCheckoutBrandingWithAssets } from "@/shared/integrations/stripe/checkout-copy";
import {
  MOMENTUM_PACK_PRICE_CENTS,
  MOMENTUM_PACK_SESSION_COUNT,
} from "@/features/booking/booking-pricing";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
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

    const entitlements = await getStudentEntitlements(user.id);
    if (!entitlements.momentumActive) {
      return NextResponse.json(
        { error: "Momentum Pack is available to active Momentum members only." },
        { status: 403 },
      );
    }

    const stripe = getStripeServer();
    const origin = getSiteUrl().replace(/\/$/, "");
    const branding = mentrixaCheckoutBrandingWithAssets(origin);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            unit_amount: MOMENTUM_PACK_PRICE_CENTS,
            product_data: {
              name: "Momentum Pack",
              description: `${MOMENTUM_PACK_SESSION_COUNT} Guide sessions at the member rate bundle`,
            },
          },
          quantity: 1,
        },
      ],
      branding_settings: branding,
      success_url: `${origin}/student?booking=pack_success`,
      cancel_url: `${origin}/student/subscribe?canceled=1`,
      metadata: {
        checkout_kind: "momentum_pack",
        user_id: user.id,
        session_credits: String(MOMENTUM_PACK_SESSION_COUNT),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[momentum-pack/checkout]", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshConnectStatus } from "@/app/actions/stripe-connect";

/**
 * GET /api/stripe/connect/return?accountId=acct_...
 * Stripe redirects the tutor here after completing the Connect onboarding form.
 * We check account status and redirect to the dashboard with a toast param.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const callbackAccountId = req.nextUrl.searchParams.get("accountId")?.trim() ?? null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(`${appUrl}/auth/signin`);
  }

  try {
    const admin = createAdminClient();
    const { data: userRow } = await admin
      .from("users")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();

    const storedAccountId = userRow?.stripe_account_id?.trim() ?? null;
    if (callbackAccountId && storedAccountId && callbackAccountId !== storedAccountId) {
      console.error("[stripe/connect/return] account mismatch", {
        userId: user.id,
        callbackAccountId,
        storedAccountId,
      });
      return NextResponse.redirect(`${appUrl}/tutor?connect=error`);
    }
  } catch (e) {
    console.error("[stripe/connect/return] preflight validation failed", e);
    return NextResponse.redirect(`${appUrl}/tutor?connect=error`);
  }

  try {
    const status = await refreshConnectStatus();

    if (status.payoutsEnabled) {
      return NextResponse.redirect(
        `${appUrl}/tutor?connect=success`
      );
    }

    // Onboarding incomplete — send back with a re-onboarding prompt
    return NextResponse.redirect(
      `${appUrl}/tutor?connect=incomplete`
    );
  } catch (err) {
    console.error("[stripe/connect/return]", err);
    return NextResponse.redirect(`${appUrl}/tutor?connect=error`);
  }
}

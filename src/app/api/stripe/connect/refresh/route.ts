import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAccountLink } from "@/app/actions/stripe-connect";

/**
 * GET /api/stripe/connect/refresh
 * Called by Stripe if the onboarding link expires — generates a fresh one
 * and redirects the tutor back into the flow.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(`${appUrl}/auth/signin`);
  }

  try {
    const { url } = await createAccountLink();
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[stripe/connect/refresh]", err);
    return NextResponse.redirect(`${appUrl}/tutor?connect=error`);
  }
}

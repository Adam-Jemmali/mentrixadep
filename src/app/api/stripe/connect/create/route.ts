import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAccountLink } from "@/app/actions/stripe-connect";

/**
 * POST /api/stripe/connect/create
 * Creates a Stripe Connect account (if needed) and returns the onboarding URL.
 * Called by the "Setup Payments" button on the tutor dashboard.
 */
export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await createAccountLink();
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[stripe/connect/create]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create onboarding link" },
      { status: 500 }
    );
  }
}

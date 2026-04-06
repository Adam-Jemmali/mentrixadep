import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow || !["tutor", "admin"].includes(userRow.role ?? "")) {
    return NextResponse.json({ error: "Stripe Connect is only available to tutors." }, { status: 403 });
  }

  try {
    const { url } = await createAccountLink();
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[stripe/connect/create]", err);
    const message = err instanceof Error ? err.message : "Failed to create onboarding link";
    const extractedUrl = message.match(/https?:\/\/[^\s"')]+/i)?.[0] ?? null;

    if (extractedUrl) {
      return NextResponse.json({ url: extractedUrl });
    }

    if (/signed up for connect/i.test(message)) {
      return NextResponse.json({ url: "https://dashboard.stripe.com/connect" });
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

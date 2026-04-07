import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { refreshConnectStatus } from "@/app/actions/stripe-connect";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appUrl = env.public.appUrl ?? "http://localhost:3000";
  const accountId = req.nextUrl.searchParams.get("accountId")?.trim() ?? null;

  try {
    const user = await requireRole(["tutor", "admin"]);
    const admin = createAdminClient();

    const { data: userRow } = await admin
      .from("users")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    const storedAccountId = userRow?.stripe_account_id?.trim() ?? null;
    if (accountId && storedAccountId && accountId !== storedAccountId) {
      console.error("[stripe/connect/return] account mismatch", {
        expected: storedAccountId,
        got: accountId,
      });
      return NextResponse.redirect(`${appUrl}/tutor?connect=error`);
    }

    const status = await refreshConnectStatus();
    if (status.payoutsEnabled) {
      return NextResponse.redirect(`${appUrl}/tutor?connect=success`);
    }

    return NextResponse.redirect(`${appUrl}/tutor?connect=incomplete`);
  } catch (err) {
    console.error("[stripe/connect/return]", err);
    return NextResponse.redirect(`${appUrl}/tutor?connect=error`);
  }
}

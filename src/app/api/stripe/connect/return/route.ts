import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site";
import { requireRole } from "@/lib/auth";
import { refreshConnectStatus, resolveStoredStripeAccountId } from "@/app/actions/stripe-connect";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appUrl = getSiteUrl();
  const accountId = req.nextUrl.searchParams.get("accountId")?.trim() ?? null;

  try {
    const user = await requireRole(["tutor", "admin"]);
    const storedAccountId = await resolveStoredStripeAccountId(user.id, true);
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

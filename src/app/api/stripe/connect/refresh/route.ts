import { NextResponse } from "next/server";
import { createAccountLink } from "@/app/actions/stripe-connect";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const appUrl = getSiteUrl();
  try {
    const { url } = await createAccountLink();
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[stripe/connect/refresh]", err);
    return NextResponse.redirect(`${appUrl}/tutor?connect=error`);
  }
}

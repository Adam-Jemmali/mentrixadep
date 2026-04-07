import { NextResponse } from "next/server";
import { createAccountLink } from "@/app/actions/stripe-connect";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const appUrl = env.public.appUrl ?? "http://localhost:3000";
  try {
    const { url } = await createAccountLink();
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[stripe/connect/refresh]", err);
    return NextResponse.redirect(`${appUrl}/tutor?connect=error`);
  }
}

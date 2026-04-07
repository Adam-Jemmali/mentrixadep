import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAccountLink } from "@/app/actions/stripe-connect";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireRole(["tutor", "admin"]);
    const { url } = await createAccountLink();
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[stripe/connect/create]", err);
    const message = err instanceof Error ? err.message : "Failed to create onboarding link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

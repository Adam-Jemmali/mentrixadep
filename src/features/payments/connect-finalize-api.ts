import { NextResponse } from "next/server";
import { refreshConnectStatus } from "@/features/payments/connect-onboarding";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const status = await refreshConnectStatus();
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to finalize Stripe Connect";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

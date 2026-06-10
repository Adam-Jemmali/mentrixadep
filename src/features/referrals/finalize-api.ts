import { NextResponse } from "next/server";
import { finalizeReferralAttribution } from "@/features/referrals/referrals";

/**
 * Client-safe alternative to importing the server action from a client component
 * (avoids broken webpack chunks / hydration issues from heavy server-only graphs).
 * Callable while logged out — handler no-ops.
 */
export async function POST() {
  try {
    const result = await finalizeReferralAttribution();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/referral/finalize]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

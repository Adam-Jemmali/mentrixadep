import { NextResponse } from "next/server";

/** Public VAPID key for `pushManager.subscribe` — set VAPID_PUBLIC_KEY in env (same pair as private key for sending). */
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  if (!key) {
    return NextResponse.json({ configured: false, publicKey: null });
  }
  return NextResponse.json({ configured: true, publicKey: key });
}

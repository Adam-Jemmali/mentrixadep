import { NextResponse } from "next/server";

/**
 * Liveness for uptime monitors (Better Stack, Pingdom, etc.). No auth.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "mentrixa",
      time: new Date().toISOString(),
    },
    { status: 200 }
  );
}

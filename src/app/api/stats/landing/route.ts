import { NextResponse } from "next/server";
import { getLandingStats } from "@/lib/landing-stats";

export const dynamic = "force-dynamic";

/**
 * Public landing metrics — real DB counts, cached server-side for 5 minutes.
 */
export async function GET() {
  try {
    const payload = await getLandingStats();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    console.error("[api/stats/landing]", e);
    return NextResponse.json(
      {
        stats: [
          { label: "active learners this month", value: 0 },
          { label: "sessions completed", value: 0 },
          { label: "Guides available now", value: 0 },
        ],
        fetchedAt: new Date().toISOString(),
        error: true,
      },
      { status: 200 }
    );
  }
}

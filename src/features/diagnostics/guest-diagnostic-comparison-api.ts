import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIpFromRequest } from "@/shared/core/security";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";
import { loadGuestComparisonBuckets } from "@/features/diagnostics/load-guest-comparison-buckets";

const querySchema = z.object({
  skillNodeId: z.string().uuid(),
});

export async function GET(req: Request) {
  try {
    const ip = getClientIpFromRequest({ headers: req.headers });
    const routeBlocked = await enforceApiRouteRateLimit("guest.classic", { ip });
    if (routeBlocked) return routeBlocked;

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      skillNodeId: url.searchParams.get("skillNodeId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "skillNodeId is required." },
        { status: 400 },
      );
    }

    const buckets = await loadGuestComparisonBuckets(parsed.data.skillNodeId);
    return NextResponse.json({ success: true, buckets });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getClientIpFromRequest } from "@/shared/core/security";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";
import { PUBLIC_FEED_CACHE_CONTROL } from "@/features/arena-widget/public-feed-pure";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": PUBLIC_FEED_CACHE_CONTROL,
};

export function publicFeedOptionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function publicFeedJsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: CORS_HEADERS,
  });
}

export async function enforcePublicFeedRateLimit(
  request: Request,
): Promise<NextResponse | null> {
  const ip = getClientIpFromRequest({ headers: request.headers });
  const blocked = await enforceApiRouteRateLimit("public.arena_feed", { ip });
  if (!blocked) return null;
  return NextResponse.json(
    { ok: false, error: "Too many requests. Try again soon." },
    {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        "Retry-After": blocked.headers.get("Retry-After") ?? "60",
      },
    },
  );
}

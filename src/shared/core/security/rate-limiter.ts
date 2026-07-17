import { NextResponse } from "next/server";
import { cacheKeys, redisSlidingWindowRateLimit } from "@/shared/core/redis";
import { recordSecurityEvent } from "@/shared/core/security/security-events";

export const API_ROUTE_LIMITS = {
  "auth.signup": { maxRequests: 5, windowMs: 15 * 60 * 1000, scope: "ip" as const },
  "auth.signin": { maxRequests: 10, windowMs: 15 * 60 * 1000, scope: "ip" as const },
  "stripe.checkout": { maxRequests: 5, windowMs: 60 * 1000, scope: "user" as const },
  "guest.practice": { maxRequests: 3, windowMs: 60 * 60 * 1000, scope: "ip" as const },
  /** New try diagnostic starts only — resume checks and page loads do not use this bucket. */
  "guest.diagnostic": { maxRequests: 12, windowMs: 60 * 60 * 1000, scope: "ip" as const },
  "guest.classic": { maxRequests: 10, windowMs: 60 * 60 * 1000, scope: "ip" as const },
  /** Public arena / guide embed feed JSON. */
  "public.arena_feed": { maxRequests: 60, windowMs: 60 * 1000, scope: "ip" as const },
  "ai.quest": { maxRequests: 20, windowMs: 60 * 60 * 1000, scope: "user" as const },
  "ai.duel": { maxRequests: 20, windowMs: 60 * 60 * 1000, scope: "user" as const },
  "quest.adaptive": { maxRequests: 20, windowMs: 60 * 60 * 1000, scope: "user" as const },
} as const;

export type ApiRouteLimitKey = keyof typeof API_ROUTE_LIMITS;

export function rateLimitKey(route: ApiRouteLimitKey, identifier: string): string {
  return `api:${route}:${identifier}`.slice(0, 240);
}

export function buildRateLimit429Response(
  retryAfterSeconds: number,
  message = "Too many requests. Please try again later.",
): NextResponse {
  return NextResponse.json(
    { ok: false, error: message, retryAfterSeconds },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) },
    },
  );
}

async function logRateLimitViolation(
  route: ApiRouteLimitKey,
  identifier: string,
  retryAfterSeconds: number,
  userId?: string | null,
  ip?: string | null,
): Promise<void> {
  await recordSecurityEvent({
    event_type: "rate_limit_exceeded",
    user_id: userId ?? null,
    ip_address: ip ?? null,
    metadata: { route, identifier: identifier.slice(0, 120), retryAfterSeconds },
  });
}

/**
 * Production route limiter — Redis first, fail-open when unavailable.
 * Returns null when allowed, or a 429 NextResponse when blocked.
 */
export async function enforceApiRouteRateLimit(
  route: ApiRouteLimitKey,
  opts: { ip?: string; userId?: string },
): Promise<NextResponse | null> {
  const limit = API_ROUTE_LIMITS[route];
  if (!limit) return null;

  const identifier =
    limit.scope === "user"
      ? opts.userId
        ? `user:${opts.userId}`
        : `ip:${opts.ip ?? "unknown"}`
      : `ip:${opts.ip ?? "unknown"}`;

  const key = rateLimitKey(route, identifier);
  const redisKey = cacheKeys.rateLimit("api", key);
  const result = await redisSlidingWindowRateLimit(
    redisKey,
    limit.maxRequests,
    limit.windowMs,
  );

  if (result.allowed) {
    return null;
  }

  await logRateLimitViolation(
    route,
    identifier,
    result.retryAfterSeconds,
    opts.userId,
    opts.ip,
  );

  return buildRateLimit429Response(result.retryAfterSeconds);
}

/** Throws when the per-user AI limit is exceeded (quest or duel bucket). */
export async function enforceUserAiRateLimit(
  userId: string,
  kind: "quest" | "duel",
): Promise<void> {
  const route = kind === "duel" ? "ai.duel" : "ai.quest";
  const blocked = await enforceApiRouteRateLimit(route, { userId });
  if (blocked) {
    const payload = (await blocked.json()) as { error?: string };
    throw new Error(payload.error ?? "Rate limit exceeded. Please try again later.");
  }
}

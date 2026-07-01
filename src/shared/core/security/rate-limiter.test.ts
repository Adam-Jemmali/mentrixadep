import { describe, expect, it } from "vitest";
import { API_ROUTE_LIMITS, buildRateLimit429Response } from "@/shared/core/security/rate-limiter";

describe("rate-limiter", () => {
  it("defines production route limits", () => {
    expect(API_ROUTE_LIMITS["auth.signup"]).toEqual({
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
      scope: "ip",
    });
    expect(API_ROUTE_LIMITS["auth.signin"]).toEqual({
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
      scope: "ip",
    });
    expect(API_ROUTE_LIMITS["stripe.checkout"].maxRequests).toBe(5);
    expect(API_ROUTE_LIMITS["guest.practice"].maxRequests).toBe(3);
    expect(API_ROUTE_LIMITS["guest.diagnostic"].maxRequests).toBe(12);
    expect(API_ROUTE_LIMITS["ai.quest"].maxRequests).toBe(20);
    expect(API_ROUTE_LIMITS["ai.duel"].maxRequests).toBe(20);
  });

  it("returns 429 with Retry-After header", async () => {
    const res = buildRateLimit429Response(42);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    const body = await res.json();
    expect(body.retryAfterSeconds).toBe(42);
  });
});

/**
 * Server-safe monitoring helpers — logs only (no third-party APM).
 */

/** Gemini / Google GenAI returned a rate-limit style error (or our message match). */
export function reportGeminiRateLimited(feature: string, message: string): void {
  console.warn(`[Gemini rate limit] ${feature}`, message.slice(0, 500));
}

export function captureStripeWebhookError(
  stage: "verify" | "metadata" | "booking",
  err: unknown,
  extra?: Record<string, unknown>
): void {
  console.error("[stripe-webhook]", stage, err, extra);
}

export function reportStripeWebhookMissingMetadata(checkoutSessionId: string): void {
  console.error("[stripe-webhook] missing availabilityId or studentId in metadata", {
    checkoutSessionId,
  });
}

export function reportStripeWebhookMissingSignature(): void {
  if (process.env.NODE_ENV !== "production") return;
  console.warn("[stripe-webhook] missing stripe-signature header");
}

/** Wrap a Supabase query (pass-through; add timing here if needed). */
export function withSupabaseQuerySpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  void name;
  return fn();
}

/** Stripe API calls (checkout, refunds, Connect). */
export function withStripeApiSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  void name;
  return fn();
}

export function captureUnexpectedError(
  scope: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  console.error(`[${scope}]`, err, extra);
}

/** Edge middleware: log client-visible HTTP errors (4xx/5xx) without PII. */
export function reportMiddlewareHttpError(params: {
  status: number;
  pathname: string;
  method: string;
  userIdRedacted: string;
}): void {
  if (params.status < 400) return;
  // In CI/dev E2E we intentionally probe guarded endpoints; keep logs clean there.
  if (
    process.env.NODE_ENV !== "production" &&
    params.status < 500 &&
    ["/api/stripe/checkout", "/api/stripe/webhook"].includes(params.pathname)
  ) {
    return;
  }
  const msg = `HTTP ${params.status} ${params.method} ${params.pathname}`;
  if (params.status >= 500) console.error(msg, { userIdRedacted: params.userIdRedacted });
  else console.warn(msg, { userIdRedacted: params.userIdRedacted });
}

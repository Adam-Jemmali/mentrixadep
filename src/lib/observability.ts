/**
 * Server-safe monitoring helpers (Sentry). No-op when DSN is unset.
 */
import * as Sentry from "@sentry/nextjs";

function sentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/** Gemini / Google GenAI returned a rate-limit style error (or our message match). */
export function reportGeminiRateLimited(feature: string, message: string): void {
  if (!sentryEnabled()) return;
  Sentry.captureMessage(`Gemini rate limit: ${feature}`, {
    level: "warning",
    tags: { component: "gemini", feature },
    extra: { message: message.slice(0, 500) },
  });
}

export function captureStripeWebhookError(
  stage: "verify" | "metadata" | "booking",
  err: unknown,
  extra?: Record<string, unknown>
): void {
  if (!sentryEnabled()) return;
  Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
    tags: { component: "stripe-webhook", stage },
    extra,
  });
}

export function reportStripeWebhookMissingMetadata(checkoutSessionId: string): void {
  if (!sentryEnabled()) return;
  Sentry.captureMessage("Stripe webhook: missing availabilityId or studentId in session metadata", {
    level: "error",
    tags: { component: "stripe-webhook", stage: "metadata" },
    extra: { checkoutSessionId },
  });
}

export function reportStripeWebhookMissingSignature(): void {
  if (!sentryEnabled()) return;
  Sentry.captureMessage("Stripe webhook: missing stripe-signature header", {
    level: "warning",
    tags: { component: "stripe-webhook", stage: "verify" },
  });
}

export function captureUnexpectedError(
  scope: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  if (!sentryEnabled()) return;
  Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
    tags: { scope },
    extra,
  });
}

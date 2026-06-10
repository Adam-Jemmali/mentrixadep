/**
 * Observability helpers — Sentry-backed error capture with structured logging.
 *
 * All functions are safe to call even when Sentry DSN is not configured
 * (dev/test environments) — they fall back to console output.
 */
import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "crypto";

export function generateRequestId(): string {
  return randomUUID();
}

function capture(
  level: "error" | "warning",
  scope: string,
  err: unknown,
  extra?: Record<string, unknown>
) {
  const message = `[${scope}] ${err instanceof Error ? err.message : String(err)}`;

  if (level === "error") {
    console.error(message, extra);
  } else {
    console.warn(message, extra);
  }

  if (err instanceof Error) {
    Sentry.captureException(err, {
      tags: { scope },
      extra,
    });
  } else {
    Sentry.captureMessage(message, {
      level,
      tags: { scope },
      extra,
    });
  }
}

export function reportGeminiRateLimited(feature: string, message: string): void {
  capture("warning", `gemini-rate-limit:${feature}`, message);
}

export function captureStripeWebhookError(
  stage: "verify" | "metadata" | "booking",
  err: unknown,
  extra?: Record<string, unknown>
): void {
  capture("error", `stripe-webhook:${stage}`, err, extra);
}

export function reportStripeWebhookMissingMetadata(checkoutSessionId: string): void {
  capture("error", "stripe-webhook:missing-metadata", new Error("Missing availabilityId or studentId in metadata"), {
    checkoutSessionId,
  });
}

export function reportStripeWebhookMissingSignature(): void {
  if (process.env.NODE_ENV !== "production") return;
  capture("warning", "stripe-webhook:missing-signature", "Missing stripe-signature header");
}

export function withSupabaseQuerySpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name: `db:${name}`, op: "db.query" }, () => fn());
}

export function withStripeApiSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name: `stripe:${name}`, op: "http.client" }, () => fn());
}

export function captureUnexpectedError(
  scope: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  capture("error", scope, err, extra);
}

export function reportMiddlewareHttpError(params: {
  status: number;
  pathname: string;
  method: string;
  userIdRedacted: string;
}): void {
  if (params.status < 400) return;
  if (
    process.env.NODE_ENV !== "production" &&
    params.status < 500 &&
    ["/api/stripe/checkout", "/api/stripe/webhook"].includes(params.pathname)
  ) {
    return;
  }
  const msg = `HTTP ${params.status} ${params.method} ${params.pathname}`;
  if (params.status >= 500) {
    capture("error", "middleware-http", msg, { userIdRedacted: params.userIdRedacted });
  } else {
    capture("warning", "middleware-http", msg, { userIdRedacted: params.userIdRedacted });
  }
}

export function reportAuthLockout(params: {
  keyType: "email";
  retryAfterSeconds: number;
}): void {
  capture("warning", "auth-lockout", `Lockout for ${params.keyType}`, params);
}

export function reportAuthCaptchaFailure(params: {
  reason: string;
  hasToken: boolean;
}): void {
  capture("warning", "auth-captcha-failure", params.reason, params);
}

export function reportSecurityRateLimitDenied(params: {
  scope: string;
  retryAfterSeconds: number;
}): void {
  capture("warning", "security-rate-limit-denied", `Rate limit hit: ${params.scope}`, params);
}

export function reportCronExecution(params: {
  job: string;
  status: "started" | "completed" | "failed";
  rowsProcessed?: number;
  durationMs?: number;
  error?: unknown;
}): void {
  const message = `[cron:${params.job}] ${params.status}`;
  if (params.status === "failed") {
    capture("error", `cron:${params.job}`, params.error ?? message, {
      rowsProcessed: params.rowsProcessed,
      durationMs: params.durationMs,
    });
  } else {
    console.log(message, {
      rowsProcessed: params.rowsProcessed,
      durationMs: params.durationMs,
    });
  }
}

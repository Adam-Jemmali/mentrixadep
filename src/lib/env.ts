/**
 * Environment variables with type safety
 * Access environment variables through this module for type safety
 */

function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
}

export function getCronSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("Missing required environment variable: CRON_SECRET");
  }
  return secret;
}

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error("Missing required environment variable: GEMINI_API_KEY");
  }
  return key;
}

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.trim() === "") {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("Missing required environment variable: STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error("Missing required environment variable: RESEND_API_KEY");
  }
  return key;
}

/**
 * Optional Sentry runtime DSNs (`NEXT_PUBLIC_SENTRY_DSN` client, `SENTRY_DSN` server/edge).
 * For readable production stack traces, set build-time `SENTRY_AUTH_TOKEN` (and `SENTRY_ORG` / `SENTRY_PROJECT`
 * or the same values in `next.config` via `withSentryConfig`) — see Sentry project settings and auth tokens.
 */
export function getOptionalSentryDsn(): string | undefined {
  return getOptionalEnvVar("SENTRY_DSN") ?? getOptionalEnvVar("NEXT_PUBLIC_SENTRY_DSN");
}

export const env = {
  // Public environment variables (exposed to the browser)
  public: {
    appUrl: getOptionalEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    stripePublishableKey: getOptionalEnvVar("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", ""),
    get supabaseUrl() {
      return getSupabaseUrl();
    },
    get supabaseAnonKey() {
      return getSupabaseAnonKey();
    },
  },
  // Server-only environment variables
  server: {
    supabaseServiceRoleKey: getOptionalEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    get cronSecret() {
      return getCronSecret();
    },
    get geminiApiKey() {
      return getGeminiApiKey();
    },
    get stripeSecretKey() {
      return getStripeSecretKey();
    },
    get stripeWebhookSecret() {
      return getStripeWebhookSecret();
    },
    get resendApiKey() {
      return getResendApiKey();
    },
  },
  // WebRTC configuration (optional - uses public STUN servers if not provided)
  webrtc: {
    stunServers: getOptionalEnvVar("NEXT_PUBLIC_STUN_SERVERS")?.split(",") || [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
    ],
    turnServers: getOptionalEnvVar("NEXT_PUBLIC_TURN_SERVERS")?.split(",") || [],
  },
} as const;



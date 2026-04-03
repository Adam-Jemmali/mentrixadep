/**
 * Environment variables with type safety
 * Access environment variables through this module for type safety
 */

function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

function requireNonEmptyEnvVar(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
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

/**
 * Validate critical secrets at startup in production.
 * Keeps development flexible while failing fast in prod misconfiguration.
 */
export function validateEnvAtStartup(): void {
  if (process.env.NODE_ENV !== "production") return;
  if ((process.env.NEXT_PHASE ?? "").includes("phase-production-build")) return;
  // Instrumentation can run during `npm run build` before NEXT_PHASE is set — skip strict checks then.
  if (process.env.npm_lifecycle_event === "build") return;
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "GEMINI_API_KEY",
    "RESEND_API_KEY",
    "CRON_SECRET",
  ];
  required.forEach((k) => requireNonEmptyEnvVar(k));

  const cronAllowlist = (process.env.CRON_ALLOWED_IPS ?? "").trim();
  const requireCronSig = (process.env.CRON_REQUIRE_SIGNATURE ?? "false").toLowerCase() === "true";
  if (!cronAllowlist && !requireCronSig) {
    throw new Error(
      "Cron hardening required: set CRON_ALLOWED_IPS or set CRON_REQUIRE_SIGNATURE=true.",
    );
  }
}

/**
 * Production validation runs from `src/instrumentation.ts` (`register()`), not on every
 * `import` of this module — otherwise public routes that only need a subset of secrets
 * (e.g. `/` + admin client) would crash before env getters are used.
 */


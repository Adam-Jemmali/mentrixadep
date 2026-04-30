import { z } from "zod";

/**
 * Flexible Environment Configuration
 * Provides backward compatibility for the entire app.
 */
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // AI & Others
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // App Metadata
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
});

const result = envSchema.safeParse(process.env);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = result.success ? result.data : ({} as any);

export const env = {
  public: {
    supabaseUrl: data.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: data.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    siteUrl: data.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    appUrl: data.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  },
  server: {
    supabaseServiceRoleKey: data.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    stripeSecretKey: data.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: data.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "",
    openaiApiKey: data.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
    resendApiKey: data.RESEND_API_KEY || process.env.RESEND_API_KEY || "",
    geminiApiKey: data.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
    nodeEnv: data.NODE_ENV || process.env.NODE_ENV || "development",
  }
};

/** 
 * BACKWARD COMPATIBILITY HELPERS
 * These ensure existing code can still call getStripeSecretKey(), etc.
 */
export function getStripeSecretKey() {
  return env.server.stripeSecretKey;
}

export function getResendApiKey() {
  return env.server.resendApiKey;
}

export function getGeminiApiKey() {
  return env.server.geminiApiKey;
}

export function getOpenaiApiKey() {
  return env.server.openaiApiKey;
}

export function getSupabaseUrl() {
  return env.public.supabaseUrl;
}

export function getSupabaseAnonKey() {
  return env.public.supabaseAnonKey;
}

export function getSupabaseServiceRoleKey() {
  return env.server.supabaseServiceRoleKey;
}

export function getStripeWebhookSecret() {
  return env.server.stripeWebhookSecret;
}

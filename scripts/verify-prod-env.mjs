import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import process from "node:process";
import { applyLocalEnvOverrides } from "./load-local-env.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Local convenience so engineers can run this before deploy without exporting env vars manually.
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  applyLocalEnvOverrides(root);
}

/**
 * Production payments use Stripe Checkout (redirect) + server SDK — no publishable key in app code.
 * Stripe Dashboard: live mode → Developers → Webhooks → endpoint `https://<domain>/api/stripe/webhook`
 * with signing secret as STRIPE_WEBHOOK_SECRET (prefix whsec_). Use sk_live_* for STRIPE_SECRET_KEY.
 */
const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "CRON_SECRET",
];

const missing = requiredVars.filter((name) => {
  const value = process.env[name];
  return !value || value.trim() === "";
});

const envLocalPath = join(root, ".env.local");
console.log(`[env:verify] .env.local present: ${existsSync(envLocalPath)}`);

if (missing.length > 0) {
  console.error("[env:verify] Missing required variables for production:");
  for (const name of missing) {
    console.error(` - ${name}`);
  }
  process.exit(1);
}

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().toLowerCase();
const stripeKey = (process.env.STRIPE_SECRET_KEY || "").trim();
if (appUrl.startsWith("https://") && stripeKey.startsWith("sk_test_")) {
  console.warn(
    "[env:warn] NEXT_PUBLIC_APP_URL looks like production but STRIPE_SECRET_KEY is test mode (sk_test_). Tutor payouts and checkout must use sk_live_ + live webhook secret.",
  );
}

console.log("[env:verify] All required production environment variables are set.");

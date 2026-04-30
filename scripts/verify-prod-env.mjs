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

const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
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

console.log("[env:verify] All required production environment variables are set.");

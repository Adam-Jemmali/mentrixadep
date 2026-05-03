import Stripe from "stripe";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
  "charge.refunded",
  "refund.updated",
  "account.updated",
];

function normalizeBaseUrl(value) {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

function readArgValue(flagName) {
  const args = process.argv.slice(2);
  const exact = `${flagName}=`;
  const inline = args.find((arg) => arg.startsWith(exact));
  if (inline) return inline.slice(exact.length);
  const idx = args.findIndex((arg) => arg === flagName);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

function checkRequiredEnv() {
  const missing = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!process.env.NEXT_PUBLIC_APP_URL) missing.push("NEXT_PUBLIC_APP_URL");
  if (!process.env.CRON_SECRET) missing.push("CRON_SECRET");
  return missing;
}

function isLikelyWebhookSecret(value) {
  return typeof value === "string" && value.startsWith("whsec_") && value.length >= 16;
}

async function verifyWebhookEndpoint(stripe, webhookUrl) {
  const listResult = await stripe.webhookEndpoints.list({ limit: 100 });
  const endpoints = Array.isArray(listResult?.data) ? listResult.data : [];

  const match = endpoints.find((ep) => ep.url === webhookUrl);
  if (!match) {
    return {
      ok: false,
      reason: `No Stripe webhook endpoint found for ${webhookUrl}`,
      endpoint: null,
    };
  }

  const enabled = new Set(match.enabled_events ?? []);
  const hasWildcard = enabled.has("*");
  const missingEvents = hasWildcard
    ? []
    : REQUIRED_WEBHOOK_EVENTS.filter((ev) => !enabled.has(ev));

  if (missingEvents.length > 0) {
    return {
      ok: false,
      reason: `Webhook endpoint exists but missing required events: ${missingEvents.join(", ")}`,
      endpoint: match,
    };
  }

  return {
    ok: true,
    reason: "Webhook endpoint and required events are configured.",
    endpoint: match,
  };
}

async function main() {
  // Load .env/.env.local similarly to Next.js so local script runs pick up project env files.
  loadEnvConfig(process.cwd());

  const missing = checkRequiredEnv();
  if (missing.length > 0) {
    console.error("Missing required env vars:");
    for (const m of missing) console.error(` - ${m}`);
    console.error("");
    console.error("If these vars exist only in Vercel, pull them locally first:");
    console.error(" - vercel env pull .env.local");
    process.exit(1);
  }

  if (!isLikelyWebhookSecret(process.env.STRIPE_WEBHOOK_SECRET)) {
    console.error("STRIPE_WEBHOOK_SECRET does not look valid (expected prefix whsec_)");
    process.exit(1);
  }

  const appUrlOverride =
    readArgValue("--app-url") ||
    process.env.STRIPE_VERIFY_APP_URL ||
    null;
  const sourceAppUrl = appUrlOverride || process.env.NEXT_PUBLIC_APP_URL;
  const appOrigin = normalizeBaseUrl(sourceAppUrl);
  if (!appOrigin) {
    console.error("App URL is not a valid absolute URL.");
    console.error("Provide one of:");
    console.error(" - NEXT_PUBLIC_APP_URL");
    console.error(" - STRIPE_VERIFY_APP_URL");
    console.error(" - --app-url https://your-domain.com");
    process.exit(1);
  }

  const webhookUrl = `${appOrigin}/api/stripe/webhook`;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  const check = await verifyWebhookEndpoint(stripe, webhookUrl);

  if (!check.ok) {
    console.error(check.reason);
    if (appOrigin.includes("localhost")) {
      console.error("");
      console.error("Tip: you are verifying against localhost. For Vercel, run:");
      console.error(" - npm run stripe:verify -- --app-url https://<your-production-domain>");
    }
    process.exit(1);
  }

  console.log("Stripe setup check passed:");
  console.log(` - Webhook URL: ${webhookUrl}`);
  console.log(` - Endpoint id: ${check.endpoint?.id ?? "unknown"}`);
  console.log(` - Events: ${(check.endpoint?.enabled_events ?? []).join(", ")}`);
  console.log(" - Required env vars present: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL, CRON_SECRET");
}

main().catch((err) => {
  console.error("Stripe setup verification failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

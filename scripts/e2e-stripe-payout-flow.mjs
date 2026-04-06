import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const HOLD_FAST_FORWARD_DEFAULT = true;

function readArgValue(flagName) {
  const args = process.argv.slice(2);
  const prefix = `${flagName}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = args.findIndex((arg) => arg === flagName);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

function asBool(value, fallback = false) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function required(name, ...fallbackNames) {
  const names = [name, ...fallbackNames];
  for (const key of names) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required env var: ${names.join(" or ")}`);
}

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

function toIso(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

async function waitFor(label, fn, options = {}) {
  const retries = options.retries ?? 40;
  const delayMs = options.delayMs ?? 1000;

  for (let i = 0; i < retries; i++) {
    const out = await fn();
    if (out) return out;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Timed out waiting for: ${label}`);
}

function buildStripeSignatureHeader(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

function buildCronHeaders(secret, method, pathname, opts = {}) {
  const headers = {
    Authorization: `Bearer ${secret}`,
  };

  const requireSignature = asBool(process.env.CRON_REQUIRE_SIGNATURE, false);
  if (!requireSignature) return headers;

  const timestamp = String(Date.now());
  const payload = `${timestamp}.${method.toUpperCase()}.${pathname}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  headers["x-cron-timestamp"] = timestamp;
  headers["x-cron-signature"] = signature;

  return headers;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    text,
    body,
  };
}

async function main() {
  const appUrlFromArg = readArgValue("--app-url");
  const appUrl =
    normalizeBaseUrl(appUrlFromArg) ||
    normalizeBaseUrl(process.env.STRIPE_VERIFY_APP_URL) ||
    normalizeBaseUrl(process.env.PLAYWRIGHT_BASE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);

  if (!appUrl) {
    throw new Error("Missing valid app URL. Set PLAYWRIGHT_BASE_URL or pass --app-url https://your-domain.com");
  }

  const supabaseUrl = required("STAGING_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceKey = required("STAGING_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = required("STRIPE_WEBHOOK_SECRET");
  const cronSecret = required("CRON_SECRET");
  const studentId = required("E2E_STUDENT_ID");
  const tutorId = required("E2E_TUTOR_ID");

  const priceCents = Number(readArgValue("--price-cents") || process.env.E2E_PRICE_CENTS || "10000");
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    throw new Error("Invalid price. Use --price-cents 10000");
  }

  const fastForwardHold = asBool(
    readArgValue("--fast-forward-hold") ?? process.env.E2E_FAST_FORWARD_HOLD,
    HOLD_FAST_FORWARD_DEFAULT,
  );

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runId = Date.now();
  const availabilityId = randomUUID();
  const checkoutSessionId = `cs_test_e2e_payout_${runId}`;

  console.log("[1/10] Verifying tutor Connect onboarding status");
  const { data: tutorRow, error: tutorError } = await supabase
    .from("users")
    .select("id, stripe_account_id, stripe_payouts_enabled")
    .eq("id", tutorId)
    .single();

  if (tutorError || !tutorRow) {
    throw new Error(`Tutor lookup failed: ${tutorError?.message ?? "not found"}`);
  }

  if (!tutorRow.stripe_account_id || !tutorRow.stripe_payouts_enabled) {
    throw new Error(
      "Tutor is not payout-ready. Finish Connect onboarding first, then rerun this script.",
    );
  }

  console.log("[2/10] Creating availability with known price");
  const startTime = toIso(2 * 60 * 60 * 1000);
  const endTime = toIso(2 * 60 * 60 * 1000 + 30 * 60 * 1000);

  const { error: availabilityError } = await supabase.from("availability").insert({
    id: availabilityId,
    tutor_id: tutorId,
    course: "E2E Stripe Payout Flow",
    start_time: startTime,
    end_time: endTime,
    price_per_session: priceCents,
    active: true,
    booking_status: "available",
  });

  if (availabilityError) {
    throw new Error(`Failed to create availability: ${availabilityError.message}`);
  }

  console.log("[3/10] Sending signed checkout.session.completed webhook");
  const stripeEvent = {
    id: `evt_e2e_payout_${runId}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: checkoutSessionId,
        object: "checkout.session",
        status: "complete",
        payment_status: "paid",
        metadata: {
          availability_id: availabilityId,
          student_id: studentId,
          tutor_id: tutorId,
          smoke_test: "true",
        },
      },
    },
  };

  const payload = JSON.stringify(stripeEvent);
  const signature = buildStripeSignatureHeader(payload, webhookSecret);

  const webhookResponse = await fetchJson(`${appUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });

  if (!webhookResponse.ok) {
    throw new Error(`Webhook failed: HTTP ${webhookResponse.status} ${webhookResponse.text}`);
  }

  console.log("[4/10] Confirming slot is booked and session is created");
  const session = await waitFor("session creation", async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id, status, start_time, end_time, payout_status, stripe_checkout_session_id")
      .eq("stripe_checkout_session_id", checkoutSessionId)
      .maybeSingle();
    return data ?? null;
  });

  const { data: availabilityAfterWebhook } = await supabase
    .from("availability")
    .select("id, booking_status, stripe_checkout_session_id")
    .eq("id", availabilityId)
    .single();

  if (availabilityAfterWebhook?.booking_status !== "booked") {
    throw new Error(`Expected availability.booking_status=booked, got ${availabilityAfterWebhook?.booking_status ?? "null"}`);
  }

  console.log("[5/10] Moving session end_time to past for complete-sessions cron");
  const pastEnd = toIso(-5 * 60 * 1000);
  const pastStart = toIso(-35 * 60 * 1000);
  const { error: sessionTimeError } = await supabase
    .from("sessions")
    .update({
      start_time: pastStart,
      end_time: pastEnd,
      status: "scheduled",
      payout_status: null,
    })
    .eq("id", session.id);

  if (sessionTimeError) {
    throw new Error(`Failed to shift session time: ${sessionTimeError.message}`);
  }

  console.log("[6/10] Triggering complete-sessions cron");
  const completePath = "/api/cron/complete-sessions";
  const completeRes = await fetchJson(`${appUrl}${completePath}`, {
    method: "GET",
    headers: buildCronHeaders(cronSecret, "GET", completePath),
  });

  if (!completeRes.ok) {
    throw new Error(`complete-sessions failed: HTTP ${completeRes.status} ${completeRes.text}`);
  }

  console.log("[7/10] Confirming payout ledger row exists with pending/held status");
  const ledgerPending = await waitFor("pending ledger", async () => {
    const { data } = await supabase
      .from("tutor_payout_ledger")
      .select("id, status, hold_until, transfer_id, gross_cents, net_cents")
      .eq("session_id", session.id)
      .maybeSingle();

    if (!data) return null;
    if (data.status === "pending" || data.status === "held") return data;
    return null;
  });

  if (fastForwardHold) {
    console.log("[8/10] Fast-forwarding hold_until to the past for test speed");
    const { error: holdError } = await supabase
      .from("tutor_payout_ledger")
      .update({ hold_until: toIso(-60 * 1000), status: "pending" })
      .eq("id", ledgerPending.id);

    if (holdError) {
      throw new Error(`Failed to fast-forward hold_until: ${holdError.message}`);
    }
  } else {
    console.log("[8/10] Hold fast-forward disabled; process-payouts may skip until hold passes");
  }

  console.log("[9/10] Triggering process-payouts cron");
  const processPath = "/api/cron/process-payouts";
  const payoutRes = await fetchJson(`${appUrl}${processPath}`, {
    method: "GET",
    headers: buildCronHeaders(cronSecret, "GET", processPath),
  });

  if (!payoutRes.ok) {
    throw new Error(`process-payouts failed: HTTP ${payoutRes.status} ${payoutRes.text}`);
  }

  console.log("[10/10] Confirming ledger moved to transferred with transfer_id");
  const transferred = await waitFor("transferred ledger", async () => {
    const { data } = await supabase
      .from("tutor_payout_ledger")
      .select("id, status, transfer_id, transferred_at, hold_until")
      .eq("id", ledgerPending.id)
      .maybeSingle();

    if (!data) return null;
    if (data.status === "transferred" && data.transfer_id) return data;
    return null;
  }, { retries: 30, delayMs: 1000 });

  console.log("Payout E2E check passed.");
  console.log(` - availability_id: ${availabilityId}`);
  console.log(` - session_id: ${session.id}`);
  console.log(` - ledger_id: ${transferred.id}`);
  console.log(` - transfer_id: ${transferred.transfer_id}`);

  console.log("Manual UI verification (tutor dashboard):");
  console.log(" - Open /tutor and inspect Payouts section.");
  console.log(" - Available/Pending chips should reflect transfer progression.");
  console.log(" - Transaction history should show status Paid for this ledger row.");
}

main().catch((err) => {
  console.error("E2E payout flow failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

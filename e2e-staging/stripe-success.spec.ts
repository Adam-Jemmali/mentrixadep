import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID } from "node:crypto";

type RequiredEnv = {
  STAGING_SUPABASE_URL: string;
  STAGING_SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  E2E_STUDENT_ID: string;
  E2E_TUTOR_ID: string;
};

function getRequiredEnv(): RequiredEnv {
  const required = [
    "STAGING_SUPABASE_URL",
    "STAGING_SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "E2E_STUDENT_ID",
    "E2E_TUTOR_ID",
  ] as const;

  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required staging smoke env vars: ${missing.join(", ")}`);
  }

  return {
    STAGING_SUPABASE_URL: process.env.STAGING_SUPABASE_URL!.trim(),
    STAGING_SUPABASE_SERVICE_ROLE_KEY: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY!.trim(),
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!.trim(),
    E2E_STUDENT_ID: process.env.E2E_STUDENT_ID!.trim(),
    E2E_TUTOR_ID: process.env.E2E_TUTOR_ID!.trim(),
  };
}

function buildStripeSignatureHeader(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

async function waitFor<T>(fn: () => Promise<T | null>, retries = 12, delayMs = 1000): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    const value = await fn();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

test("stripe checkout completed webhook creates booking artifacts", async ({ request }) => {
  const env = getRequiredEnv();

  const supabase = createClient(env.STAGING_SUPABASE_URL, env.STAGING_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const availabilityId = randomUUID();
  const runId = Date.now();
  const checkoutSessionId = `cs_test_smoke_${runId}`;

  const startTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

  const cleanup = async () => {
    await supabase.from("sessions").delete().eq("stripe_checkout_session_id", checkoutSessionId);
    await supabase.from("session_requests").delete().eq("stripe_checkout_session_id", checkoutSessionId);
    await supabase.from("availability").delete().eq("id", availabilityId);
  };

  await cleanup();

  const { error: availabilityInsertError } = await supabase.from("availability").insert({
    id: availabilityId,
    tutor_id: env.E2E_TUTOR_ID,
    course: "Smoke Test Course",
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    price_per_session: 2500,
    active: true,
    booking_status: "available",
  });

  expect(availabilityInsertError?.message ?? "").toBe("");

  try {
    const stripeEvent = {
      id: `evt_test_smoke_${runId}`,
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
            student_id: env.E2E_STUDENT_ID,
            tutor_id: env.E2E_TUTOR_ID,
            smoke_test: "true",
          },
        },
      },
    };

    const payload = JSON.stringify(stripeEvent);
    const signature = buildStripeSignatureHeader(payload, env.STRIPE_WEBHOOK_SECRET);

    const webhookRes = await request.post("/api/stripe/webhook", {
      data: payload,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });

    expect(webhookRes.status()).toBe(200);
    const webhookBody = await webhookRes.json();
    expect(webhookBody).toMatchObject({ received: true });

    const sessionRequestRow = await waitFor(async () => {
      const { data } = await supabase
        .from("session_requests")
        .select("id, availability_id, student_id, tutor_id, stripe_checkout_session_id")
        .eq("stripe_checkout_session_id", checkoutSessionId)
        .maybeSingle();
      return data;
    });

    expect(sessionRequestRow).not.toBeNull();
    expect(sessionRequestRow?.availability_id).toBe(availabilityId);
    expect(sessionRequestRow?.student_id).toBe(env.E2E_STUDENT_ID);
    expect(sessionRequestRow?.tutor_id).toBe(env.E2E_TUTOR_ID);

    const { data: availabilityAfter } = await supabase
      .from("availability")
      .select("booking_status, stripe_checkout_session_id")
      .eq("id", availabilityId)
      .maybeSingle();

    // Depending on approval flow, row may be deleted or retained; when retained it should be booked+linked.
    if (availabilityAfter) {
      expect(availabilityAfter.booking_status).toBe("booked");
      expect(availabilityAfter.stripe_checkout_session_id).toBe(checkoutSessionId);
    }
  } finally {
    await cleanup();
  }
});

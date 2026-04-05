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

type BookingArtifacts = {
  sessionRequest: {
    id: string;
    availability_id: string;
    student_id: string;
    tutor_id: string;
    stripe_checkout_session_id: string | null;
  } | null;
  session: {
    id: string;
    availability_id: string | null;
    student_id: string;
    tutor_id: string;
  } | null;
};

async function findBookingArtifacts(
  supabase: any,
  checkoutSessionId: string,
  availabilityId: string,
  studentId: string,
  tutorId: string,
): Promise<BookingArtifacts> {
  const [{ data: sessionRequest }, { data: session }] = await Promise.all([
    supabase
      .from("session_requests")
      .select("id, availability_id, student_id, tutor_id, stripe_checkout_session_id")
      .eq("stripe_checkout_session_id", checkoutSessionId)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, availability_id, student_id, tutor_id")
      .eq("availability_id", availabilityId)
      .eq("student_id", studentId)
      .eq("tutor_id", tutorId)
      .maybeSingle(),
  ]);

  return {
    sessionRequest: sessionRequest ?? null,
    session: session ?? null,
  };
}

async function ensureApprovedBookingUser(
  supabase: any,
  userId: string,
  role: "student" | "tutor",
) {
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) {
    throw new Error(`Staging smoke user not found in auth.users: ${userId}`);
  }

  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: userId,
      role,
      approved: true,
    },
    { onConflict: "id" },
  );

  expect(upsertError?.message ?? "").toBe("");
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

  await ensureApprovedBookingUser(supabase, env.E2E_STUDENT_ID, "student");
  await ensureApprovedBookingUser(supabase, env.E2E_TUTOR_ID, "tutor");

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
      // Send the exact raw bytes Stripe signs so the webhook sees the same body.
      data: Buffer.from(payload, "utf-8"),
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });

    expect(webhookRes.status()).toBe(200);
    const webhookBody = await webhookRes.json();
    expect(webhookBody).toMatchObject({ received: true });

    const artifacts = await waitFor(async () => {
      const value = await findBookingArtifacts(
        supabase,
        checkoutSessionId,
        availabilityId,
        env.E2E_STUDENT_ID,
        env.E2E_TUTOR_ID,
      );
      if (value.sessionRequest || value.session) {
        return value;
      }
      return null;
    }, 60, 1000);

    if (!artifacts) {
      const [availabilityDebug, webhookLogDebug] = await Promise.all([
        supabase
          .from("availability")
          .select("id, booking_status, stripe_checkout_session_id, locked_by, locked_until")
          .eq("id", availabilityId)
          .maybeSingle(),
        supabase
          .from("stripe_webhook_log")
          .select("event_id, event_type, created_at")
          .eq("event_id", stripeEvent.id)
          .maybeSingle(),
      ]);

      throw new Error(
        `No booking artifacts materialized for checkout ${checkoutSessionId}. ` +
          `webhookResponse=${JSON.stringify(webhookBody)} ` +
          `availability=${JSON.stringify(availabilityDebug.data ?? null)} ` +
          `webhookLog=${JSON.stringify(webhookLogDebug.data ?? null)}`,
      );
    }

    if (artifacts.sessionRequest) {
      expect(artifacts.sessionRequest.availability_id).toBe(availabilityId);
      expect(artifacts.sessionRequest.student_id).toBe(env.E2E_STUDENT_ID);
      expect(artifacts.sessionRequest.tutor_id).toBe(env.E2E_TUTOR_ID);
      expect(artifacts.sessionRequest.stripe_checkout_session_id).toBe(checkoutSessionId);
    }

    if (artifacts.session) {
      expect(artifacts.session.availability_id).toBe(availabilityId);
      expect(artifacts.session.student_id).toBe(env.E2E_STUDENT_ID);
      expect(artifacts.session.tutor_id).toBe(env.E2E_TUTOR_ID);
    }

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

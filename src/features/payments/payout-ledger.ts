"use server";

import Stripe from "stripe";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { checkGuaranteeForSession } from "@/features/payments/accuracy-guarantee";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { validateUUID } from "@/shared/core/security";
import {
  buildOnboardingGuide,
  getStripe,
  payoutEligibleAfterIso,
  platformFeeCents,
  tutorNetCents,
} from "@/features/payments/connect-internal";
import { getStudentSessionCheckoutCents } from "@/features/booking/booking-pricing";
import {
  openStripeConnectOrDashboard,
  resolveStoredStripeAccountId,
  type ConnectStatus,
} from "@/features/payments/connect-onboarding";

export type { ConnectStatus };

function scheduleConnectPayoutRetries(tutorId: string, logPrefix: string): void {
  after(async () => {
    try {
      const r = await retryPendingTransfersForTutor(tutorId);
      if (r.scanned > 0) {
        revalidatePath("/tutor");
      }
    } catch (e) {
      console.error(logPrefix, e);
    }
  });
}

export type PayoutLedgerRow = {
  id: string;
  session_id: string | null;
  session_date: string | null;
  course: string | null;
  gross_cents: number;
  platform_fee_cents: number;
  net_cents: number;
  status: string;
  transfer_id: string | null;
  transferred_at: string | null;
  hold_until: string | null;
  created_at: string;
  student_id?: string | null;
  student_name?: string | null;
};

export type PayoutDashboardData = {
  connectStatus: ConnectStatus;
  pendingCents: number;
  queuedCents: number;
  availableCents: number;
  lifetimeEarnedCents: number;
  ledger: PayoutLedgerRow[];
};

export async function getPayoutDashboardData(tutorIdOverride?: string): Promise<PayoutDashboardData> {
  if (tutorIdOverride) validateUUID(tutorIdOverride);
  const fallback: PayoutDashboardData = {
    connectStatus: {
      hasAccount: false,
      accountId: null,
      payoutsEnabled: false,
      onboardingUrl: null,
      onboardingGuide: buildOnboardingGuide(null),
    },
    pendingCents: 0,
    queuedCents: 0,
    availableCents: 0,
    lifetimeEarnedCents: 0,
    ledger: [],
  };

  const user = await requireRole(["tutor", "admin"]);
  const tutorId = tutorIdOverride ?? user.id;
  const admin = createAdminClient();
  const stripe = getStripe();

  try {
    const { data: userRow } = await admin
      .from("users")
      .select("stripe_account_id, stripe_account_id_test, stripe_account_id_live, stripe_payouts_enabled")
      .eq("id", tutorId)
      .single();

    let account: Stripe.Account | null = null;
    const accountId = await resolveStoredStripeAccountId(tutorId, true);
    if (accountId) {
      try {
        account = await stripe.accounts.retrieve(accountId);
      } catch {
        account = null;
      }
    }

    const payoutsEnabled =
      account != null
        ? account.payouts_enabled === true && account.charges_enabled === true
        : Boolean(accountId && userRow?.stripe_payouts_enabled);

    const connectStatus: ConnectStatus = {
      hasAccount: Boolean(accountId),
      accountId,
      payoutsEnabled,
      onboardingUrl: null,
      onboardingGuide: buildOnboardingGuide(account),
    };

    let availableCents = 0;
    if (accountId && payoutsEnabled) {
      try {
        const bal = await stripe.balance.retrieve({ stripeAccount: accountId });
        const cad = bal.available.find((b) => b.currency === "cad");
        const usd = bal.available.find((b) => b.currency === "usd");
        const pick = cad ?? usd ?? bal.available[0];
        if (pick) availableCents = pick.amount;
      } catch {
        availableCents = 0;
      }
    }

    if (connectStatus.payoutsEnabled && accountId) {
      try {
        const { count: pendingCount, error: pendingErr } = await admin
          .from("tutor_payout_ledger")
          .select("id", { count: "exact", head: true })
          .eq("tutor_id", tutorId)
          .in("status", ["pending", "held"]);
        if (!pendingErr && (pendingCount ?? 0) > 0) {
          void scheduleConnectPayoutRetries(tutorId, "[connect] retry on dashboard load");
        }
      } catch (e) {
        console.error("[connect] pending payout count failed:", e);
      }
    }

    const { data: ledgerRows } = await admin
      .from("tutor_payout_ledger")
      .select("*")
      .eq("tutor_id", tutorId)
      .order("created_at", { ascending: false })
      .limit(100);

    const rows: PayoutLedgerRow[] = ledgerRows ?? [];

    const studentIds = [...new Set(rows.map((r) => r.student_id).filter(Boolean))] as string[];
    const nameMap = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: settings } = await admin
        .from("user_settings")
        .select("user_id, display_name")
        .in("user_id", studentIds);
      (settings ?? []).forEach((s) => {
        if (s.display_name) nameMap.set(s.user_id, s.display_name);
      });

      await Promise.all(
        studentIds
          .filter((id) => !nameMap.has(id))
          .map(async (id) => {
            try {
              const { data: authUser } = await admin.auth.admin.getUserById(id);
              const email = authUser?.user?.email;
              if (email) nameMap.set(id, email.split("@")[0] ?? "Learner");
            } catch {
              // ignore
            }
          }),
      );
    }

    const cents = (v: unknown): number => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "") return Number(v) || 0;
      return 0;
    };

    const enrichedLedger: PayoutLedgerRow[] = rows.map((r) => {
      const sid = r.student_id != null ? String(r.student_id) : null;
      return {
        id: String((r as { id: unknown }).id),
        session_id: r.session_id != null ? String(r.session_id) : null,
        session_date: typeof r.session_date === "string" ? r.session_date : null,
        course: typeof r.course === "string" ? r.course : null,
        gross_cents: cents((r as { gross_cents?: unknown }).gross_cents),
        platform_fee_cents: cents((r as { platform_fee_cents?: unknown }).platform_fee_cents),
        net_cents: cents((r as { net_cents?: unknown }).net_cents),
        status: typeof (r as { status?: unknown }).status === "string" ? String((r as { status: string }).status) : "unknown",
        transfer_id: (r as { transfer_id?: unknown }).transfer_id != null ? String((r as { transfer_id: unknown }).transfer_id) : null,
        transferred_at:
          typeof (r as { transferred_at?: unknown }).transferred_at === "string"
            ? (r as { transferred_at: string }).transferred_at
            : null,
        hold_until: typeof (r as { hold_until?: unknown }).hold_until === "string" ? (r as { hold_until: string }).hold_until : null,
        created_at:
          typeof (r as { created_at?: unknown }).created_at === "string"
            ? (r as { created_at: string }).created_at
            : new Date().toISOString(),
        student_id: sid,
        student_name: sid ? (nameMap.get(sid) ?? null) : null,
      };
    });

    let queuedCents = 0;
    let lifetimeEarnedCents = 0;

    for (const row of enrichedLedger) {
      if (row.status === "pending") {
        queuedCents += row.net_cents;
      } else if (row.status === "transferred") {
        lifetimeEarnedCents += row.net_cents;
      } else if (row.status === "held") {
        queuedCents += row.net_cents;
      }
    }

    return {
      connectStatus,
      pendingCents: queuedCents,
      queuedCents,
      availableCents,
      lifetimeEarnedCents,
      ledger: enrichedLedger,
    };
  } catch (e) {
    console.error("[connect:payout-loader] failed", {
      tutorId,
      error: e instanceof Error ? e.message : String(e),
    });
    return fallback;
  }
}

export async function triggerManualPayout(amountCents?: number): Promise<{ url: string }> {
  void amountCents;
  return openStripeConnectOrDashboard();
}

export async function transferSessionPayout(ledgerRowId: string): Promise<void> {
  validateUUID(ledgerRowId);
  const admin = createAdminClient();

  const { data: ledger } = await admin
    .from("tutor_payout_ledger")
    .select("*")
    .eq("id", ledgerRowId)
    .single();

  if (!ledger) throw new Error(`Ledger row not found: ${ledgerRowId}`);
  if (ledger.status !== "pending" && ledger.status !== "held") return;

  if (ledger.session_id) {
    const { data: session } = await admin
      .from("sessions")
      .select("status, completed, start_time, end_time, stripe_destination_charge, stripe_payment_intent_id")
      .eq("id", ledger.session_id)
      .maybeSingle();

    const sessionEnd = session?.end_time ? new Date(session.end_time) : null;
    if (sessionEnd && sessionEnd.getTime() > Date.now()) {
      return;
    }

    if (session && (session as { stripe_destination_charge?: boolean }).stripe_destination_charge === true) {
      const paymentIntentId =
        (session as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id ?? null;
      await admin
        .from("tutor_payout_ledger")
        .update({
          status: "transferred",
          transfer_id: paymentIntentId,
          transferred_at: new Date().toISOString(),
        })
        .eq("id", ledgerRowId)
        .in("status", ["pending", "held"]);
      await admin.from("sessions").update({ payout_status: "transferred" }).eq("id", ledger.session_id);
      return;
    }

    const sessionStatus = session?.status ?? null;
    const sessionStart = session?.start_time ? new Date(session.start_time) : null;
    const hasStarted = !!sessionStart && sessionStart.getTime() <= Date.now();
    const isCancellableState = sessionStatus === "cancelled";

    if (isCancellableState || !hasStarted) {
      return;
    }
  }

  // Actual payout transfer logic for sessions that were NOT destination charges
  // (i.e. the student paid Mentrixa directly and we now move the tutor's share)
  const stripeAccountId = await resolveStoredStripeAccountId(ledger.tutor_id, true);
  if (!stripeAccountId) {
    console.warn(`[connect] ledger ${ledgerRowId}: tutor ${ledger.tutor_id} has no Stripe account; cannot pay out.`);
    return;
  }

  const stripe = getStripe();
  try {
    const transfer = await stripe.transfers.create({
      amount: ledger.net_cents,
      currency: "cad",
      destination: stripeAccountId,
      description: `Payout for ${ledger.course || "session"} (ID: ${ledger.session_id || "N/A"})`,
      metadata: {
        ledger_id: ledger.id,
        tutor_id: ledger.tutor_id,
        session_id: ledger.session_id,
      },
    });

    await admin
      .from("tutor_payout_ledger")
      .update({
        status: "transferred",
        transfer_id: transfer.id,
        transferred_at: new Date().toISOString(),
      })
      .eq("id", ledgerRowId)
      .in("status", ["pending", "held"]);

    if (ledger.session_id) {
      await admin.from("sessions").update({ payout_status: "transferred" }).eq("id", ledger.session_id);
    }

    console.log(`[connect] ledger ${ledgerRowId}: payout of ${ledger.net_cents} CAD transferred to ${stripeAccountId}`);
  } catch (err) {
    console.error(`[connect] ledger ${ledgerRowId}: Stripe transfer failed:`, err);
    throw err;
  }
}

export async function retryPendingTransfersForTutor(tutorId: string): Promise<{
  scanned: number;
  errors: number;
}> {
  validateUUID(tutorId);
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("tutor_payout_ledger")
    .select("id")
    .eq("tutor_id", tutorId)
    .in("status", ["pending", "held"])
    .order("created_at", { ascending: true });

  let errors = 0;
  for (const row of rows ?? []) {
    try {
      await transferSessionPayout(row.id);
    } catch {
      errors++;
    }
  }
  return { scanned: rows?.length ?? 0, errors };
}

export async function createPayoutLedgerForSession(sessionId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: session, error: fetchError } = await admin
    .from("sessions")
    .select(
      "id, tutor_id, student_id, course, start_time, end_time, availability_id, price_per_session, stripe_destination_charge, stripe_payment_intent_id",
    )
    .eq("id", sessionId)
    .single();

  if (fetchError) {
    console.error("[connect] failed to fetch session:", fetchError);
    return;
  }

  if (!session) {
    console.error("[connect] session not found:", sessionId);
    return;
  }

  const sessionTiming = session as {
    end_time?: string | null;
    start_time?: string | null;
  };
  const holdUntil = payoutEligibleAfterIso(sessionTiming);

  const destination =
    (session as { stripe_destination_charge?: boolean | null }).stripe_destination_charge === true;
  const paymentIntentId =
    (session as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id ?? null;

  const { data: existingLedger, error: existingLedgerError } = await admin
    .from("tutor_payout_ledger")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existingLedgerError) {
    console.error("[connect] failed to check existing payout ledger row:", existingLedgerError);
    return;
  }

  if (existingLedger?.id) {
    try {
      await transferSessionPayout(existingLedger.id);
    } catch (err) {
      console.warn("[connect] immediate payout transfer failed; cron retry may pick it up later:", err);
    }

    await admin
      .from("sessions")
      .update({ payout_status: "pending" })
      .eq("id", sessionId)
      .is("payout_status", null);
    return;
  }

  let grossCents =
    typeof session.price_per_session === "number" ? session.price_per_session : null;

  if (grossCents == null && session.availability_id) {
    const { data: availability } = await admin
      .from("availability")
      .select("price_per_session")
      .eq("id", session.availability_id)
      .maybeSingle();
    if (typeof availability?.price_per_session === "number") {
      grossCents = availability.price_per_session;
    }
  }

  if (grossCents == null) grossCents = getStudentSessionCheckoutCents();
  const net = tutorNetCents(grossCents);
  const fee = platformFeeCents(grossCents);

  if (destination) {
    const { error: destErr } = await admin
      .from("tutor_payout_ledger")
      .insert({
        tutor_id: session.tutor_id,
        session_id: session.id,
        session_date: session.start_time,
        student_id: session.student_id,
        course: session.course,
        gross_cents: grossCents,
        platform_fee_cents: fee,
        net_cents: net,
        status: "transferred",
        hold_until: holdUntil,
        transfer_id: paymentIntentId,
        transferred_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (destErr && destErr.code !== "23505") {
      console.error("[connect] destination ledger insert error:", destErr);
      return;
    }

    if (destErr?.code === "23505") {
      await admin.from("sessions").update({ payout_status: "transferred" }).eq("id", sessionId);
      return;
    }

    await admin.from("sessions").update({ payout_status: "transferred" }).eq("id", sessionId);
    return;
  }

  const { error, data } = await admin
    .from("tutor_payout_ledger")
    .insert({
      tutor_id: session.tutor_id,
      session_id: session.id,
      session_date: session.start_time,
      student_id: session.student_id,
      course: session.course,
      gross_cents: grossCents,
      platform_fee_cents: fee,
      net_cents: net,
      status: "pending",
      hold_until: holdUntil,
    })
    .select("id")
    .single();

  if (error && error.code !== "23505") {
    console.error("[connect] createPayoutLedgerForSession insert error:", {
      code: error.code,
      message: error.message,
    });
    return;
  }

  const ledgerId = data?.id;

  if (ledgerId) {
    try {
      await transferSessionPayout(ledgerId);
    } catch (err) {
      console.warn("[connect] immediate payout transfer failed; cron retry may pick it up later:", err);
    }
  }

  const { error: updateError } = await admin
    .from("sessions")
    .update({ payout_status: "pending" })
    .eq("id", sessionId)
    .is("payout_status", null);

  if (updateError) {
    console.error("[connect] failed to update session payout_status:", updateError);
  }
}

export async function processQueuedPayouts(): Promise<{ processed: number; failed: number }> {
  const admin = createAdminClient();

  const { data: readyRows } = await admin
    .from("tutor_payout_ledger")
    .select("id, session_id")
    .in("status", ["pending", "held"])
    .lte("hold_until", new Date().toISOString())
    .limit(50);

  let processed = 0;
  let failed = 0;

  for (const row of readyRows ?? []) {
    if (row.session_id) {
      await checkGuaranteeForSession(row.session_id);

      const { data: session } = await admin
        .from("sessions")
        .select("stripe_refund_id")
        .eq("id", row.session_id)
        .maybeSingle();

      if (session?.stripe_refund_id) {
        await admin
          .from("tutor_payout_ledger")
          .update({ status: "refunded" })
          .eq("id", row.id)
          .in("status", ["pending", "held"]);
        continue;
      }
    }

    try {
      await transferSessionPayout(row.id);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}

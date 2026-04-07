"use server";

import Stripe from "stripe";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey } from "@/lib/env";
import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";
import { captureUnexpectedError } from "@/lib/observability";
import { PLATFORM_FEE_BPS } from "@/lib/booking-pricing";

const TUTOR_SHARE_BPS = 10_000 - PLATFORM_FEE_BPS;

function tutorNetCents(grossCents: number): number {
  return Math.round((grossCents * TUTOR_SHARE_BPS) / 10_000);
}

function platformFeeCents(grossCents: number): number {
  return grossCents - tutorNetCents(grossCents);
}

function transferReadyAt(sessionStartIso?: string | null): string {
  if (sessionStartIso) return sessionStartIso;
  return new Date().toISOString();
}

function stripeClient(): Stripe {
  return new Stripe(getStripeSecretKey());
}

export type ConnectStatus = {
  hasAccount: boolean;
  accountId: string | null;
  payoutsEnabled: boolean;
  onboardingUrl: string | null;
  onboardingGuide: {
    accountReady: boolean;
    nextAction: string | null;
    disabledReason: string | null;
    currentlyDue: string[];
    steps: Array<{
      key: string;
      label: string;
      done: boolean;
      details?: string;
    }>;
  };
};

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

function hasAnyRequirement(requirements: string[], keys: string[]): boolean {
  const lower = requirements.map((r) => r.toLowerCase());
  return keys.some((k) => lower.some((r) => r.includes(k)));
}

function buildOnboardingGuide(account: Stripe.Account | null): ConnectStatus["onboardingGuide"] {
  if (!account) {
    return {
      accountReady: false,
      nextAction: "Start Stripe setup",
      disabledReason: null,
      currentlyDue: [],
      steps: [
        { key: "open", label: "Open Stripe setup", done: false, details: "Click Setup payments to begin." },
        { key: "personal", label: "Add personal details", done: false },
        { key: "business", label: "Choose Individual/Sole proprietor", done: false },
        { key: "bank", label: "Add your bank account", done: false },
        { key: "review", label: "Submit for verification", done: false },
      ],
    };
  }

  const payoutsEnabled = account.payouts_enabled === true;
  const chargesEnabled = account.charges_enabled === true;
  const fullyEnabled = payoutsEnabled && chargesEnabled;
  const req = account.requirements;
  const currentlyDue = req?.currently_due ?? [];
  const pastDue = req?.past_due ?? [];
  const pendingVerification = req?.pending_verification ?? [];
  const allOpen = [...new Set([...currentlyDue, ...pastDue, ...pendingVerification])];

  const hasPersonal = hasAnyRequirement(allOpen, ["individual", "person"]);
  const hasBusiness = hasAnyRequirement(allOpen, ["business_profile", "company", "mcc", "product_description", "url"]);
  const hasBank = hasAnyRequirement(allOpen, ["external_account", "bank_account"]);

  const steps: ConnectStatus["onboardingGuide"]["steps"] = [
    { key: "open", label: "Open Stripe setup", done: true },
    {
      key: "personal",
      label: "Add personal details",
      done: !hasPersonal,
      details: hasPersonal ? "Use your real legal name, date of birth, and ID details." : undefined,
    },
    {
      key: "business",
      label: "Choose Individual/Sole proprietor",
      done: !hasBusiness,
      details: hasBusiness ? "You do not need a company. Pick Individual or Sole proprietor." : undefined,
    },
    {
      key: "bank",
      label: "Add your bank account",
      done: !hasBank,
      details: hasBank ? "Enter routing number and account number to receive payouts." : undefined,
    },
    {
      key: "review",
      label: "Submit for verification",
      done: allOpen.length === 0,
      details: allOpen.length > 0 ? `Still required: ${allOpen.slice(0, 3).join(", ")}${allOpen.length > 3 ? "..." : ""}` : undefined,
    },
  ];

  return {
    accountReady: fullyEnabled,
    nextAction: fullyEnabled ? null : "Continue Stripe setup",
    disabledReason: req?.disabled_reason ?? null,
    currentlyDue,
    steps,
  };
}

export async function createConnectAccount(): Promise<{ accountId: string }> {
  const user = await requireRole(["tutor", "admin"]);
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (userRow?.stripe_account_id) {
    return { accountId: userRow.stripe_account_id };
  }

  const { data: authUser } = await admin.auth.admin.getUserById(user.id);
  const email = authUser?.user?.email;

  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: email ?? undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    settings: {
      payouts: {
        schedule: { interval: "weekly", weekly_anchor: "friday" },
      },
    },
    metadata: { tutor_id: user.id, platform: "mentrixa" },
  });

  await admin
    .from("users")
    .update({ stripe_account_id: account.id })
    .eq("id", user.id);

  revalidatePath("/tutor");
  return { accountId: account.id };
}

export async function createAccountLink(): Promise<{ url: string }> {
  await requireRole(["tutor", "admin"]);
  const { accountId } = await createConnectAccount();
  const stripe = stripeClient();

  const appUrl = env.public.appUrl ?? "http://localhost:3000";

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/api/stripe/connect/refresh`,
    return_url: `${appUrl}/api/stripe/connect/return?accountId=${accountId}`,
    type: "account_onboarding",
  });

  return { url: link.url };
}

export async function refreshConnectStatus(tutorId?: string): Promise<ConnectStatus> {
  const user = await requireRole(["tutor", "admin"]);
  const actingId = tutorId ?? user.id;
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id, stripe_payouts_enabled, stripe_onboarding_at")
    .eq("id", actingId)
    .single();

  if (!userRow?.stripe_account_id) {
    return {
      hasAccount: false,
      accountId: null,
      payoutsEnabled: false,
      onboardingUrl: null,
      onboardingGuide: buildOnboardingGuide(null),
    };
  }

  const account = await stripe.accounts.retrieve(userRow.stripe_account_id);
  const payoutsEnabled = account.payouts_enabled === true;
  const chargesEnabled = account.charges_enabled === true;
  const fullyEnabled = payoutsEnabled && chargesEnabled;

  if (userRow.stripe_payouts_enabled !== fullyEnabled) {
    const updatePayload: {
      stripe_payouts_enabled: boolean;
      stripe_onboarding_at?: string;
    } = {
      stripe_payouts_enabled: fullyEnabled,
    };

    if (fullyEnabled && !userRow.stripe_onboarding_at) {
      updatePayload.stripe_onboarding_at = new Date().toISOString();
    }

    await admin
      .from("users")
      .update(updatePayload)
      .eq("id", actingId);
  }

  const becameFullyEnabled = fullyEnabled && userRow.stripe_payouts_enabled !== true;
  if (becameFullyEnabled) {
    void scheduleConnectPayoutRetries(actingId, "[connect] retry after onboarding");
  }

  let onboardingUrl: string | null = null;
  if (!fullyEnabled) {
    try {
      const appUrl = env.public.appUrl ?? "http://localhost:3000";
      const link = await stripe.accountLinks.create({
        account: userRow.stripe_account_id,
        refresh_url: `${appUrl}/api/stripe/connect/refresh`,
        return_url: `${appUrl}/api/stripe/connect/return?accountId=${userRow.stripe_account_id}`,
        type: "account_onboarding",
      });
      onboardingUrl = link.url;
    } catch {
      // Non-critical
    }
  }

  revalidatePath("/tutor");
  return {
    hasAccount: true,
    accountId: userRow.stripe_account_id,
    payoutsEnabled: fullyEnabled,
    onboardingUrl,
    onboardingGuide: buildOnboardingGuide(account),
  };
}

export async function getPayoutDashboardData(tutorIdOverride?: string): Promise<PayoutDashboardData> {
  const user = await requireRole(["tutor", "admin"]);
  const tutorId = tutorIdOverride ?? user.id;
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", tutorId)
    .single();

  const payoutsEnabledBeforeSync = userRow?.stripe_payouts_enabled ?? false;
  let payoutsEnabledSynced = payoutsEnabledBeforeSync;

  const connectStatus: ConnectStatus = {
    hasAccount: !!userRow?.stripe_account_id,
    accountId: userRow?.stripe_account_id ?? null,
    payoutsEnabled: payoutsEnabledSynced,
    onboardingUrl: null,
    onboardingGuide: buildOnboardingGuide(null),
  };

  if (connectStatus.accountId) {
    try {
      const account = await stripe.accounts.retrieve(connectStatus.accountId);
      const fullyEnabled = account.payouts_enabled === true && account.charges_enabled === true;
      if (fullyEnabled !== payoutsEnabledSynced) {
        await admin
          .from("users")
          .update({ stripe_payouts_enabled: fullyEnabled })
          .eq("id", tutorId);
        payoutsEnabledSynced = fullyEnabled;
      }
      connectStatus.payoutsEnabled = payoutsEnabledSynced;
      connectStatus.onboardingGuide = buildOnboardingGuide(account);
    } catch {
      // Non-critical
    }
  }

  if (connectStatus.payoutsEnabled && connectStatus.accountId) {
    try {
      const { count: pendingCount, error: pendingErr } = await admin
        .from("tutor_payout_ledger")
        .select("id", { count: "exact", head: true })
        .eq("tutor_id", tutorId)
        .in("status", ["pending", "held"]);
      if (!pendingErr && (pendingCount ?? 0) > 0) {
        // Never await bulk Stripe work during RSC — it can exceed serverless limits and crash production renders.
        void scheduleConnectPayoutRetries(tutorId, "[connect] retry on dashboard load");
      }
    } catch (e) {
      console.error("[connect] pending payout count / schedule retry failed:", e);
    }
  }

  if (connectStatus.accountId && !connectStatus.payoutsEnabled) {
    try {
      const appUrl = env.public.appUrl ?? "http://localhost:3000";
      const link = await stripe.accountLinks.create({
        account: connectStatus.accountId,
        refresh_url: `${appUrl}/api/stripe/connect/refresh`,
        return_url: `${appUrl}/api/stripe/connect/return?accountId=${connectStatus.accountId}`,
        type: "account_onboarding",
      });
      connectStatus.onboardingUrl = link.url;
    } catch {
      // Non-critical
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
          const { data: authUser } = await admin.auth.admin.getUserById(id);
          const email = authUser?.user?.email;
          if (email) nameMap.set(id, email.split("@")[0] ?? "Learner");
        })
    );
  }

  const enrichedLedger: PayoutLedgerRow[] = rows.map((r) => ({
    ...r,
    student_name: r.student_id ? (nameMap.get(r.student_id) ?? null) : null,
  }));

  let queuedCents = 0;
  let availableCents = 0;
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

  if (connectStatus.accountId && connectStatus.payoutsEnabled) {
    try {
      const balance = await stripe.balance.retrieve({}, { stripeAccount: connectStatus.accountId });
      const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
      availableCents = available;
    } catch {
      // non-fatal
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
}

export async function triggerManualPayout(amountCents?: number): Promise<{ payoutId: string }> {
  const user = await requireRole(["tutor", "admin"]);
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", user.id)
    .single();

  if (!userRow?.stripe_account_id) {
    throw new Error("Complete payment setup before requesting a payout.");
  }
  if (!userRow.stripe_payouts_enabled) {
    throw new Error("Your Stripe account is not fully set up yet. Finish onboarding first.");
  }

  const balance = await stripe.balance.retrieve({}, { stripeAccount: userRow.stripe_account_id });
  const availableUsd = balance.available.find((b) => b.currency === "usd");
  const availableCents = availableUsd?.amount ?? 0;

  if (availableCents <= 0) {
    throw new Error("No available balance to pay out.");
  }

  const payoutAmount = amountCents ?? availableCents;
  if (payoutAmount > availableCents) {
    throw new Error(`Requested amount exceeds available balance ($${(availableCents / 100).toFixed(2)}).`);
  }

  const payout = await stripe.payouts.create(
    {
      amount: payoutAmount,
      currency: "usd",
      statement_descriptor: "MENTRIXA EARNINGS",
      metadata: { tutor_id: user.id },
    },
    { stripeAccount: userRow.stripe_account_id }
  );

  revalidatePath("/tutor");
  return { payoutId: payout.id };
}

export async function transferSessionPayout(ledgerRowId: string): Promise<void> {
  const admin = createAdminClient();
  const stripe = stripeClient();

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
      .select("status, completed, start_time")
      .eq("id", ledger.session_id)
      .maybeSingle();

    const sessionStatus = session?.status ?? null;
    const sessionStart = session?.start_time ? new Date(session.start_time) : null;
    const hasStarted = !!sessionStart && sessionStart.getTime() <= Date.now();
    const isCancellableState = sessionStatus === "cancelled";

    if (isCancellableState || !hasStarted) {
      return;
    }
  }

  const { data: tutor } = await admin
    .from("users")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", ledger.tutor_id)
    .single();

  if (!tutor?.stripe_account_id || !tutor.stripe_payouts_enabled) {
    console.warn(`[connect] skipping transfer: tutor ${ledger.tutor_id} has no enabled Connect account`);
    return;
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: ledger.net_cents,
        currency: "usd",
        destination: tutor.stripe_account_id,
        transfer_group: ledger.session_id ?? ledgerRowId,
        metadata: {
          ledger_id: ledgerRowId,
          session_id: ledger.session_id ?? "",
          tutor_id: ledger.tutor_id,
        },
      },
      { idempotencyKey: `payout_${ledgerRowId}` }
    );

    await admin
      .from("tutor_payout_ledger")
      .update({
        status: "transferred",
        transfer_id: transfer.id,
        transferred_at: new Date().toISOString(),
      })
      .eq("id", ledgerRowId);

    if (ledger.session_id) {
      await admin
        .from("sessions")
        .update({
          stripe_transfer_id: transfer.id,
          payout_status: "transferred",
        })
        .eq("id", ledger.session_id);
    }
  } catch (err) {
    captureUnexpectedError("stripe-connect-transfer", err, { ledgerRowId });
    await admin
      .from("tutor_payout_ledger")
      .update({ status: "failed" })
      .eq("id", ledgerRowId);
    throw err;
  }
}

/**
 * Re-run Connect transfers for ledger rows still `pending`/`held` (e.g. tutor finished
 * onboarding after sessions paid — earlier attempts no-op'd while `stripe_payouts_enabled` was false).
 */
export async function retryPendingTransfersForTutor(tutorId: string): Promise<{
  scanned: number;
  errors: number;
}> {
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

/**
 * Run Connect retries in the background — never block RSC or short API routes on N Stripe calls.
 */
function scheduleConnectPayoutRetries(tutorId: string, logPrefix: string): void {
  void (async () => {
    try {
      const r = await retryPendingTransfersForTutor(tutorId);
      if (r.scanned > 0) {
        revalidatePath("/tutor");
      }
    } catch (e) {
      console.error(logPrefix, e);
    }
  })();
}

export async function createPayoutLedgerForSession(sessionId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: session, error: fetchError } = await admin
    .from("sessions")
    .select("id, tutor_id, student_id, course, start_time, availability_id, price_per_session")
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

  if (grossCents == null) grossCents = 2500;
  const net = tutorNetCents(grossCents);
  const fee = platformFeeCents(grossCents);

  const { error, data } = await admin
    .from("tutor_payout_ledger")
    .insert(
      {
        tutor_id: session.tutor_id,
        session_id: session.id,
        session_date: session.start_time,
        student_id: session.student_id,
        course: session.course,
        gross_cents: grossCents,
        platform_fee_cents: fee,
        net_cents: net,
        status: "pending",
        hold_until: transferReadyAt(session.start_time),
      },
    )
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
    .select("id")
    .in("status", ["pending", "held"])
    .lt("hold_until", new Date().toISOString())
    .limit(50);

  let processed = 0;
  let failed = 0;

  for (const row of readyRows ?? []) {
    try {
      await transferSessionPayout(row.id);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}

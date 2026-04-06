"use server";

/**
 * Stripe Connect — tutor onboarding and payout actions.
 *
 * Flow:
 *  1. createConnectAccount()     → create Express account, store acct_... on users row
 *  2. createAccountLink()        → generate onboarding URL for redirect
 *  3. refreshConnectStatus()     → called on return from onboarding; checks if payouts enabled
 *  4. getPayoutDashboardData()   → earnings, ledger, pending/available balance
 *  5. triggerManualPayout()      → Stripe payout API (transfer from platform to bank)
 *  6. transferSessionPayout()    → create Stripe Transfer after session hold lifts
 *  7. processHeldPayouts()       → cron: fire all transfers past hold_until
 */

import Stripe from "stripe";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey } from "@/lib/env";
import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";
import { captureUnexpectedError } from "@/lib/observability";
import { PLATFORM_FEE_BPS } from "@/lib/booking-pricing";

// ─── Constants ────────────────────────────────────────────────────────────────

/** 7-day hold before releasing funds to tutor. */
const HOLD_DAYS = 7;
/** Tutor's share in bps derived from shared platform fee config. */
const TUTOR_SHARE_BPS = 10_000 - PLATFORM_FEE_BPS;

function tutorNetCents(grossCents: number): number {
  return Math.round((grossCents * TUTOR_SHARE_BPS) / 10_000);
}

function platformFeeCents(grossCents: number): number {
  return grossCents - tutorNetCents(grossCents);
}

function holdUntilDate(): string {
  return new Date(Date.now() + HOLD_DAYS * 86_400_000).toISOString();
}

function stripeClient(): Stripe {
  return new Stripe(getStripeSecretKey());
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectStatus = {
  hasAccount: boolean;
  accountId: string | null;
  payoutsEnabled: boolean;
  onboardingUrl: string | null;
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
  pendingCents: number;        // completed, not yet transferred (within hold)
  heldCents: number;           // held, waiting for hold window to pass
  availableCents: number;      // transferred / Stripe balance ready to withdraw
  lifetimeEarnedCents: number;
  ledger: PayoutLedgerRow[];
};

// ─── 1. Create Connect account ────────────────────────────────────────────────

/**
 * Creates a Stripe Connect Express account for the current tutor.
 * Idempotent: returns existing account if already created.
 */
export async function createConnectAccount(): Promise<{ accountId: string }> {
  const user = await requireRole(["tutor", "admin"]);
  const admin = createAdminClient();
  const stripe = stripeClient();

  // Check existing
  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (userRow?.stripe_account_id) {
    return { accountId: userRow.stripe_account_id };
  }

  // Fetch email for pre-fill
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

// ─── 2. Create account link (onboarding URL) ──────────────────────────────────

/**
 * Generates a fresh Stripe Connect onboarding link.
 * Creates the account first if it doesn't exist yet.
 */
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

// ─── 3. Refresh Connect status (called on return from Stripe) ─────────────────

/**
 * Checks whether a tutor's Connect account has payouts enabled.
 * Updates `users.stripe_payouts_enabled` accordingly.
 */
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
  };
}

// ─── 4. Payout dashboard data ─────────────────────────────────────────────────

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

  let payoutsEnabledSynced = userRow?.stripe_payouts_enabled ?? false;

  // Build connect status
  const connectStatus: ConnectStatus = {
    hasAccount: !!userRow?.stripe_account_id,
    accountId: userRow?.stripe_account_id ?? null,
    payoutsEnabled: payoutsEnabledSynced,
    onboardingUrl: null,
  };

  // Keep local users.stripe_payouts_enabled in sync with Stripe on dashboard load.
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
    } catch {
      // Non-critical: fall back to cached DB value.
    }
  }

  // Provide a direct onboarding URL for the payout banner when Connect is incomplete.
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
      // Non-critical: UI can still fall back to POST /api/stripe/connect/create
    }
  }

  // Fetch ledger rows
  const { data: ledgerRows } = await admin
    .from("tutor_payout_ledger")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows: PayoutLedgerRow[] = ledgerRows ?? [];

  // Enrich with student names
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

    // Fall back to email local-part for any missing
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

  // Compute buckets
  const now = Date.now();
  let pendingCents = 0;
  let heldCents = 0;
  let availableCents = 0;
  let lifetimeEarnedCents = 0;

  for (const row of enrichedLedger) {
    if (row.status === "pending") {
      const holdExpiry = row.hold_until ? new Date(row.hold_until).getTime() : 0;
      if (holdExpiry > now) {
        heldCents += row.net_cents;
      } else {
        pendingCents += row.net_cents;
      }
    } else if (row.status === "transferred") {
      lifetimeEarnedCents += row.net_cents;
    } else if (row.status === "held") {
      heldCents += row.net_cents;
    }
  }

  // "Available" = Stripe Connect account balance (transferred funds not yet paid out to bank)
  if (userRow?.stripe_account_id && userRow?.stripe_payouts_enabled) {
    try {
      const stripe = stripeClient();
      const balance = await stripe.balance.retrieve(
        {},
        { stripeAccount: userRow.stripe_account_id }
      );
      const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
      availableCents = available;
    } catch {
      // non-fatal
    }
  }

  return {
    connectStatus,
    pendingCents,
    heldCents,
    availableCents,
    lifetimeEarnedCents,
    ledger: enrichedLedger,
  };
}

// ─── 5. Trigger manual payout to bank ────────────────────────────────────────

/**
 * Initiates a Stripe Payout from the tutor's Connect account balance to their bank.
 * This is the "Transfer to Bank" CTA.
 */
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
    throw new Error("Your Stripe account isn't fully set up yet. Finish the onboarding flow.");
  }

  // Check available balance
  const balance = await stripe.balance.retrieve(
    {},
    { stripeAccount: userRow.stripe_account_id }
  );
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

// ─── 6. Transfer session payout to Connect account ────────────────────────────

/**
 * Creates a Stripe Transfer from the platform account to the tutor's Connect account
 * for a single completed session. Called by the cron after hold_until passes.
 */
export async function transferSessionPayout(ledgerRowId: string): Promise<void> {
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: ledger } = await admin
    .from("tutor_payout_ledger")
    .select("*")
    .eq("id", ledgerRowId)
    .single();

  if (!ledger) throw new Error(`Ledger row not found: ${ledgerRowId}`);
  if (ledger.status !== "pending" && ledger.status !== "held") return; // already processed

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

    // Update session payout_status
    if (ledger.session_id) {
      await admin
        .from("sessions")
        .update({
          stripe_transfer_id: transfer.id,
          payout_status: "transferred",
        })
        .eq("id", ledger.session_id);
    }

    console.log(`[connect] transfer ${transfer.id} → ${tutor.stripe_account_id} for $${(ledger.net_cents / 100).toFixed(2)}`);
  } catch (err) {
    captureUnexpectedError("stripe-connect-transfer", err, { ledgerRowId });
    await admin
      .from("tutor_payout_ledger")
      .update({ status: "failed" })
      .eq("id", ledgerRowId);
    throw err;
  }
}

// ─── 7. Create ledger row when session completes ──────────────────────────────

/**
 * Called when a session is marked as completed.
 * Creates a tutor_payout_ledger row with pending status and 7-day hold.
 * Idempotent (unique constraint on session_id).
 */
export async function createPayoutLedgerForSession(sessionId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, tutor_id, student_id, course, start_time, price_per_session")
    .eq("id", sessionId)
    .single();

  if (!session) return;

  const grossCents = session.price_per_session ?? 0;
  const net = tutorNetCents(grossCents);
  const fee = platformFeeCents(grossCents);

  const { error } = await admin
    .from("tutor_payout_ledger")
    .upsert({
      tutor_id: session.tutor_id,
      session_id: session.id,
      session_date: session.start_time,
      student_id: session.student_id,
      course: session.course,
      gross_cents: grossCents,
      platform_fee_cents: fee,
      net_cents: net,
      status: "pending",
      hold_until: holdUntilDate(),
    }, { onConflict: "session_id", ignoreDuplicates: true });

  if (error && error.code !== "23505") {
    console.error("[connect] createPayoutLedgerForSession error:", error);
  }

  // Mark session payout as pending
  await admin
    .from("sessions")
    .update({ payout_status: "pending" })
    .eq("id", sessionId)
    .is("payout_status", null);
}

// ─── 8. Batch: process all held payouts past hold_until ──────────────────────

/**
 * Called by cron: find all pending ledger rows past their hold window
 * and fire the Stripe transfers.
 */
export async function processHeldPayouts(): Promise<{ processed: number; failed: number }> {
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

  console.log(`[connect] processHeldPayouts: ${processed} transferred, ${failed} failed`);
  return { processed, failed };
}

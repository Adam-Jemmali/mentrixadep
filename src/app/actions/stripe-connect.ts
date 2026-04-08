"use server";

import Stripe from "stripe";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey } from "@/lib/env";
import { getSiteUrl } from "@/lib/site";
import { revalidatePath } from "next/cache";
import { PLATFORM_FEE_BPS } from "@/lib/booking-pricing";

const TUTOR_SHARE_BPS = 10_000 - PLATFORM_FEE_BPS;

function getStripe(): Stripe {
  return new Stripe(getStripeSecretKey());
}

/** ISO 3166-1 alpha-2 for Express Connect accounts (default Canada per product). */
function getConnectAccountCountry(): string {
  const raw = (process.env.STRIPE_CONNECT_ACCOUNT_COUNTRY ?? "CA").trim().toUpperCase();
  return raw.length === 2 ? raw : "CA";
}

function tutorNetCents(grossCents: number): number {
  return Math.round((grossCents * TUTOR_SHARE_BPS) / 10_000);
}

function platformFeeCents(grossCents: number): number {
  return grossCents - tutorNetCents(grossCents);
}

function payoutEligibleAfterIso(session: { end_time?: string | null; start_time?: string | null }): string {
  if (session.end_time) return session.end_time;
  if (session.start_time) return session.start_time;
  return new Date().toISOString();
}

function isStripeConnectNotEnabledError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("signed up for Connect") ||
    msg.includes("Connect") && msg.includes("not enabled") ||
    msg.includes("connect_onboarding_disabled")
  );
}

/**
 * Ensure the tutor has a Stripe Express connected account id (lazy-create on first onboarding).
 */
async function ensureTutorExpressAccountId(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("users").select("stripe_account_id").eq("id", userId).maybeSingle();
  const existing = row?.stripe_account_id?.trim();
  if (existing) return existing;

  const stripe = getStripe();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? undefined;

  let account: Stripe.Account;
  try {
    account = await stripe.accounts.create({
      type: "express",
      country: getConnectAccountCountry(),
      email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { tutor_id: userId },
    });
  } catch (e) {
    if (isStripeConnectNotEnabledError(e)) {
      throw new Error(
        "Stripe Connect is not enabled on the platform Stripe account yet. Open https://dashboard.stripe.com/connect and finish Connect activation."
      );
    }
    throw e;
  }

  await admin.from("users").update({ stripe_account_id: account.id }).eq("id", userId);
  return account.id;
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
      nextAction: "Start Stripe Connect",
      disabledReason: null,
      currentlyDue: [],
      steps: [
        { key: "open", label: "Open payout setup", done: false, details: "Connect your Stripe Express account." },
        { key: "personal", label: "Add your details in Stripe", done: false },
        { key: "business", label: "Individual / sole proprietor", done: false },
        { key: "bank", label: "Add bank account for payouts", done: false },
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
      label: "Choose Individual / Sole proprietor",
      done: !hasBusiness,
      details: hasBusiness ? "You do not need a company. Pick Individual or Sole proprietor." : undefined,
    },
    {
      key: "bank",
      label: "Add your bank account",
      done: !hasBank,
      details: hasBank ? "Enter bank details to receive payouts from Stripe." : undefined,
    },
    {
      key: "review",
      label: "Submit for verification",
      done: allOpen.length === 0,
      details:
        allOpen.length > 0 ? `Still required: ${allOpen.slice(0, 3).join(", ")}${allOpen.length > 3 ? "..." : ""}` : undefined,
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

export async function createAccountLink(): Promise<{ url: string }> {
  const user = await requireRole(["tutor", "admin"]);
  const accountId = await ensureTutorExpressAccountId(user.id);
  const stripe = getStripe();
  const appUrl = getSiteUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/api/stripe/connect/refresh`,
    return_url: `${appUrl}/api/stripe/connect/return`,
    type: "account_onboarding",
  });
  return { url: link.url };
}

/**
 * Onboarding link if requirements remain; otherwise Express Dashboard login (balance & payouts).
 */
export async function openStripeConnectOrDashboard(): Promise<{ url: string }> {
  const user = await requireRole(["tutor", "admin"]);
  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  const accountId = userRow?.stripe_account_id?.trim() ?? null;

  if (accountId && userRow?.stripe_payouts_enabled) {
    const login = await stripe.accounts.createLoginLink(accountId);
    return { url: login.url };
  }

  return createAccountLink();
}

export async function refreshConnectStatus(tutorId?: string): Promise<ConnectStatus> {
  const user = await requireRole(["tutor", "admin"]);
  const actingId = tutorId ?? user.id;
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id, stripe_payouts_enabled, stripe_onboarding_at")
    .eq("id", actingId)
    .maybeSingle();

  let account: Stripe.Account | null = null;
  if (userRow?.stripe_account_id) {
    try {
      account = await stripe.accounts.retrieve(userRow.stripe_account_id);
    } catch (e) {
      console.warn("[connect] retrieve account failed:", e);
    }
  }

  let becameFullyEnabled = false;
  if (account) {
    const payoutsEnabled = account.payouts_enabled === true;
    const chargesEnabled = account.charges_enabled === true;
    const fullyEnabled = payoutsEnabled && chargesEnabled;

    const { data: row } = await admin
      .from("users")
      .select("stripe_payouts_enabled, stripe_onboarding_at")
      .eq("id", actingId)
      .maybeSingle();

    if (row && row.stripe_payouts_enabled !== fullyEnabled) {
      const updatePayload: { stripe_payouts_enabled: boolean; stripe_onboarding_at?: string } = {
        stripe_payouts_enabled: fullyEnabled,
      };
      if (fullyEnabled && !row.stripe_onboarding_at) {
        updatePayload.stripe_onboarding_at = new Date().toISOString();
      }
      await admin.from("users").update(updatePayload).eq("id", actingId);
    }

    becameFullyEnabled = fullyEnabled && row?.stripe_payouts_enabled !== true;
    if (becameFullyEnabled) {
      void scheduleConnectPayoutRetries(actingId, "[connect] retry after refreshConnectStatus");
    }
  }

  const payoutsEnabled =
    account != null ? account.payouts_enabled === true && account.charges_enabled === true : Boolean(userRow?.stripe_payouts_enabled);

  revalidatePath("/tutor");
  return {
    hasAccount: Boolean(userRow?.stripe_account_id),
    accountId: userRow?.stripe_account_id ?? null,
    payoutsEnabled,
    onboardingUrl: null,
    onboardingGuide: buildOnboardingGuide(account),
  };
}

export async function applyStripeAccountWebhookUpdate(account: Stripe.Account): Promise<void> {
  const admin = createAdminClient();
  const stripeAccountId = account.id;
  let tutorId: string | null =
    typeof account.metadata?.tutor_id === "string" ? account.metadata.tutor_id : null;

  if (!tutorId) {
    const { data } = await admin.from("users").select("id").eq("stripe_account_id", stripeAccountId).maybeSingle();
    tutorId = data?.id ?? null;
  }

  if (!tutorId) {
    console.warn("[connect] account.updated: no user for Stripe account", stripeAccountId);
    return;
  }

  const payoutsEnabled = account.payouts_enabled === true;
  const chargesEnabled = account.charges_enabled === true;
  const fullyEnabled = payoutsEnabled && chargesEnabled;

  const { data: userRow } = await admin
    .from("users")
    .select("stripe_payouts_enabled, stripe_onboarding_at")
    .eq("id", tutorId)
    .single();

  if (!userRow) return;

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
    await admin.from("users").update(updatePayload).eq("id", tutorId);
  }

  const becameFullyEnabled = fullyEnabled && userRow.stripe_payouts_enabled !== true;
  if (becameFullyEnabled) {
    void scheduleConnectPayoutRetries(tutorId, "[connect] retry after account.updated webhook");
  }
}

export async function getPayoutDashboardData(tutorIdOverride?: string): Promise<PayoutDashboardData> {
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
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("id", tutorId)
      .single();

    let account: Stripe.Account | null = null;
    if (userRow?.stripe_account_id) {
      try {
        account = await stripe.accounts.retrieve(userRow.stripe_account_id);
      } catch {
        account = null;
      }
    }

    const payoutsEnabled =
      account != null
        ? account.payouts_enabled === true && account.charges_enabled === true
        : Boolean(userRow?.stripe_payouts_enabled);

    const connectStatus: ConnectStatus = {
      hasAccount: Boolean(userRow?.stripe_account_id),
      accountId: userRow?.stripe_account_id ?? null,
      payoutsEnabled,
      onboardingUrl: null,
      onboardingGuide: buildOnboardingGuide(account),
    };

    let availableCents = 0;
    if (userRow?.stripe_account_id && payoutsEnabled) {
      try {
        const bal = await stripe.balance.retrieve({ stripeAccount: userRow.stripe_account_id });
        const cad = bal.available.find((b) => b.currency === "cad");
        const usd = bal.available.find((b) => b.currency === "usd");
        const pick = cad ?? usd ?? bal.available[0];
        if (pick) availableCents = pick.amount;
      } catch {
        availableCents = 0;
      }
    }

    if (connectStatus.payoutsEnabled && userRow?.stripe_account_id) {
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

  console.warn(
    `[connect] ledger ${ledgerRowId}: no destination charge on session — Connect marketplace expects stripe_destination_charge; leaving row pending.`,
  );
}

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

  if (grossCents == null) grossCents = 2500;
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
    .select("id")
    .in("status", ["pending", "held"])
    .lte("hold_until", new Date().toISOString())
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

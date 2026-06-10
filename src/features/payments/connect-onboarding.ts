"use server";

import Stripe from "stripe";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getSiteUrl } from "@/shared/core/site";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { formatStripeConnectError } from "@/shared/integrations/stripe/connect-errors";
import { validateUUID } from "@/shared/core/security";
import {
  buildOnboardingGuide,
  getConnectAccountCountry,
  getLegacyStripeAccountId,
  getModeStripeAccountId,
  getStripe,
  isStripeInvalidAccountReferenceError,
  loadStripeAccountRow,
  setStripeAccountIdForCurrentMode,
} from "@/features/payments/connect-internal";

function isStripeConnectNotEnabledError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("signed up for Connect") ||
    (msg.includes("Connect") && msg.includes("not enabled")) ||
    msg.includes("connect_onboarding_disabled")
  );
}

function scheduleConnectPayoutRetries(tutorId: string, logPrefix: string): void {
  after(async () => {
    try {
      const { retryPendingTransfersForTutor } = await import("@/features/payments/payout-ledger");
      const r = await retryPendingTransfersForTutor(tutorId);
      if (r.scanned > 0) {
        revalidatePath("/tutor");
      }
    } catch (e) {
      console.error(logPrefix, e);
    }
  });
}

export async function resolveStoredStripeAccountId(userId: string, adoptLegacy = true): Promise<string | null> {
  validateUUID(userId);
  const admin = createAdminClient();
  const row = await loadStripeAccountRow(admin, userId);
  const stripe = getStripe();

  const selectedAccountId = getModeStripeAccountId(row);
  if (selectedAccountId) {
    try {
      await stripe.accounts.retrieve(selectedAccountId);
      return selectedAccountId;
    } catch (err) {
      if (!isStripeInvalidAccountReferenceError(err)) {
        throw err;
      }
      await setStripeAccountIdForCurrentMode(admin, userId, null);
      return null;
    }
  }

  if (adoptLegacy) {
    const legacyAccountId = getLegacyStripeAccountId(row);
    if (legacyAccountId) {
      try {
        await stripe.accounts.retrieve(legacyAccountId);
        await setStripeAccountIdForCurrentMode(admin, userId, legacyAccountId);
        return legacyAccountId;
      } catch (err) {
        if (!isStripeInvalidAccountReferenceError(err)) {
          throw err;
        }
      }
    }
  }

  return null;
}

/** Ensure the tutor has a Stripe Express connected account id (lazy-create on first onboarding). */
async function ensureTutorExpressAccountId(userId: string): Promise<string> {
  const admin = createAdminClient();
  const existing = await resolveStoredStripeAccountId(userId, true);
  if (existing) {
    return existing;
  }

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
        "Stripe Connect is not enabled on the platform Stripe account yet. Open https://dashboard.stripe.com/connect and finish Connect activation.",
      );
    }
    throw e;
  }

  await setStripeAccountIdForCurrentMode(admin, userId, account.id);
  return account.id;
}

export type ConnectStatus = {
  hasAccount: boolean;
  accountId: string | null;
  payoutsEnabled: boolean;
  onboardingUrl: string | null;
  onboardingGuide: import("@/features/payments/connect-internal").ConnectOnboardingGuide;
};

export async function createAccountLink(): Promise<{ url: string }> {
  const user = await requireRole(["tutor", "admin"]);
  const accountId = await ensureTutorExpressAccountId(user.id);
  const appUrl = getSiteUrl();

  const stripe = getStripe();
  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/tutor/stripe/refresh`,
      return_url: `${appUrl}/tutor/stripe/success`,
      type: "account_onboarding",
    });
    return { url: link.url };
  } catch (e) {
    throw new Error(formatStripeConnectError(e));
  }
}

/**
 * Onboarding link if requirements remain; otherwise Express Dashboard login (balance & payouts).
 */
export async function openStripeConnectOrDashboard(): Promise<{ url: string }> {
  const user = await requireRole(["tutor", "admin"]);
  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id, stripe_account_id_test, stripe_account_id_live, stripe_payouts_enabled")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  const accountId = await resolveStoredStripeAccountId(user.id, true);

  if (accountId && userRow?.stripe_payouts_enabled) {
    try {
      await stripe.accounts.retrieve(accountId);
      const login = await stripe.accounts.createLoginLink(accountId);
      return { url: login.url };
    } catch (err) {
      if (!isStripeInvalidAccountReferenceError(err)) {
        throw err;
      }
    }
  }

  return createAccountLink();
}

export async function refreshConnectStatus(tutorId?: string): Promise<ConnectStatus> {
  if (tutorId) validateUUID(tutorId);
  const user = await requireRole(["tutor", "admin"]);
  const actingId = tutorId ?? user.id;
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: userRow } = await admin
    .from("users")
    .select("stripe_account_id, stripe_account_id_test, stripe_account_id_live, stripe_payouts_enabled, stripe_onboarding_at")
    .eq("id", actingId)
    .maybeSingle();

  let account: Stripe.Account | null = null;
  const accountId = await resolveStoredStripeAccountId(actingId, true);
  if (accountId) {
    try {
      account = await stripe.accounts.retrieve(accountId);
    } catch (e) {
      if (isStripeInvalidAccountReferenceError(e)) {
        await setStripeAccountIdForCurrentMode(admin, actingId, null);
      } else {
        console.warn("[connect] retrieve account failed:", e);
      }
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
    account != null
      ? account.payouts_enabled === true && account.charges_enabled === true
      : Boolean(accountId && userRow?.stripe_payouts_enabled);

  revalidatePath("/tutor");
  return {
    hasAccount: Boolean(accountId),
    accountId,
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
    const { data } = await admin
      .from("users")
      .select("id")
      .or(
        `stripe_account_id.eq.${stripeAccountId},stripe_account_id_test.eq.${stripeAccountId},stripe_account_id_live.eq.${stripeAccountId}`,
      )
      .maybeSingle();
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

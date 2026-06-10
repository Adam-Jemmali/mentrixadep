import Stripe from "stripe";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStripeSecretKey } from "@/shared/core/env";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { PLATFORM_FEE_BPS } from "@/features/booking/booking-pricing";

const TUTOR_SHARE_BPS = 10_000 - PLATFORM_FEE_BPS;
const STRIPE_ACCOUNT_ID_TEST_COLUMN = "stripe_account_id_test" as const;
const STRIPE_ACCOUNT_ID_LIVE_COLUMN = "stripe_account_id_live" as const;

type AdminClient = ReturnType<typeof createAdminClient>;

type StripeAccountRow = {
  stripe_account_id?: string | null;
  stripe_account_id_test?: string | null;
  stripe_account_id_live?: string | null;
  stripe_payouts_enabled?: boolean | null;
  stripe_onboarding_at?: string | null;
};

type StripeAccountMode = "test" | "live";

export function getStripe(): Stripe {
  return getStripeServer();
}

function isLiveStripeMode(): boolean {
  return getStripeSecretKey().startsWith("sk_live");
}

function getStripeAccountMode(): StripeAccountMode {
  return isLiveStripeMode() ? "live" : "test";
}

function getStripeAccountColumnForMode(): typeof STRIPE_ACCOUNT_ID_TEST_COLUMN | typeof STRIPE_ACCOUNT_ID_LIVE_COLUMN {
  return isLiveStripeMode() ? STRIPE_ACCOUNT_ID_LIVE_COLUMN : STRIPE_ACCOUNT_ID_TEST_COLUMN;
}

export function getModeStripeAccountId(row: StripeAccountRow | null | undefined): string | null {
  const value = getStripeAccountMode() === "live" ? row?.stripe_account_id_live : row?.stripe_account_id_test;
  return value?.trim() ?? null;
}

export function getLegacyStripeAccountId(row: StripeAccountRow | null | undefined): string | null {
  return row?.stripe_account_id?.trim() ?? null;
}

export async function loadStripeAccountRow(admin: AdminClient, userId: string): Promise<StripeAccountRow | null> {
  const { data } = await admin
    .from("users")
    .select("stripe_account_id, stripe_account_id_test, stripe_account_id_live, stripe_payouts_enabled, stripe_onboarding_at")
    .eq("id", userId)
    .maybeSingle();

  return data as StripeAccountRow | null;
}

export async function setStripeAccountIdForCurrentMode(admin: AdminClient, userId: string, accountId: string | null): Promise<void> {
  const column = getStripeAccountColumnForMode();
  await admin.from("users").update({ [column]: accountId } as Record<string, string | null>).eq("id", userId);
}

/** ISO 3166-1 alpha-2 for Express Connect accounts (default Canada per product). */
export function getConnectAccountCountry(): string {
  const raw = (process.env.STRIPE_CONNECT_ACCOUNT_COUNTRY ?? "CA").trim().toUpperCase();
  return raw.length === 2 ? raw : "CA";
}

export function tutorNetCents(grossCents: number): number {
  return Math.round((grossCents * TUTOR_SHARE_BPS) / 10_000);
}

export function platformFeeCents(grossCents: number): number {
  return grossCents - tutorNetCents(grossCents);
}

export function payoutEligibleAfterIso(session: { end_time?: string | null; start_time?: string | null }): string {
  if (session.end_time) return session.end_time;
  if (session.start_time) return session.start_time;
  return new Date().toISOString();
}

export function isStripeInvalidAccountReferenceError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("No such account") ||
    msg.includes("resource_missing") ||
    msg.includes("does not have access to account")
  );
}

export type ConnectOnboardingGuide = {
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

function hasAnyRequirement(requirements: string[], keys: string[]): boolean {
  const lower = requirements.map((r) => r.toLowerCase());
  return keys.some((k) => lower.some((r) => r.includes(k)));
}

export function buildOnboardingGuide(account: Stripe.Account | null): ConnectOnboardingGuide {
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

  const steps: ConnectOnboardingGuide["steps"] = [
    { key: "open", label: "Open Stripe setup", done: true },
    {
      key: "personal",
      label: "Add personal details",
      done: !hasPersonal,
      details: hasPersonal ? "Use your real legal name, date of birth and ID details." : undefined,
    },
    {
      key: "business",
      label: "Choose Individual / Sole proprietor",
      done: !hasBusiness,
      details: hasBusiness ? "When asked to fill company, write your porfolio's name and website as the company." : undefined,
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

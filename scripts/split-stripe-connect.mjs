#!/usr/bin/env node
/** Split features/payments/stripe-connect.ts into connect-onboarding + payout-ledger. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAYMENTS = path.join(path.dirname(__dirname), "src/features/payments");
const src = fs.readFileSync(path.join(PAYMENTS, "stripe-connect.ts"), "utf8").split("\n");

function slice(start, end) {
  return src.slice(start - 1, end).join("\n");
}

const connectInternal = `import Stripe from "stripe";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStripeSecretKey } from "@/shared/core/env";
import { getStripeServer } from "@/shared/integrations/stripe/server";
import { PLATFORM_FEE_BPS } from "@/features/booking/booking-pricing";

${slice(15, 303)}
`;

const connectInternalExported = connectInternal
  .replace(/^function getStripe\(\)/m, "export function getStripe()")
  .replace(/^function isStripeInvalidAccountReferenceError/m, "export function isStripeInvalidAccountReferenceError")
  .replace(/^async function setStripeAccountIdForCurrentMode/m, "export async function setStripeAccountIdForCurrentMode")
  .replace(/^async function loadStripeAccountRow/m, "export async function loadStripeAccountRow")
  .replace(/^async function ensureTutorExpressAccountId/m, "export async function ensureTutorExpressAccountId")
  .replace(/^function buildOnboardingGuide/m, "export function buildOnboardingGuide")
  .replace(/^function tutorNetCents/m, "export function tutorNetCents")
  .replace(/^function platformFeeCents/m, "export function platformFeeCents")
  .replace(/^function payoutEligibleAfterIso/m, "export function payoutEligibleAfterIso");

const connectOnboardingHeader = `"use server";

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
  ensureTutorExpressAccountId,
  getStripe,
  isStripeInvalidAccountReferenceError,
  setStripeAccountIdForCurrentMode,
} from "@/features/payments/connect-internal";

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

`;
const connectOnboarding =
  connectOnboardingHeader +
  slice(71, 107) +
  "\n\n" +
  slice(187, 204) +
  "\n\n" +
  slice(305, 475);

const payoutLedgerHeader = `"use server";

import Stripe from "stripe";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
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
import {
  openStripeConnectOrDashboard,
  refreshConnectStatus,
  resolveStoredStripeAccountId,
  type ConnectStatus,
} from "@/features/payments/connect-onboarding";

export type { ConnectStatus };

`;
const payoutLedger =
  payoutLedgerHeader +
  slice(206, 230) +
  "\n\n" +
  slice(477, 652) +
  "\n\n" +
  slice(654, 775) +
  "\n\n" +
  slice(790, src.length);

fs.writeFileSync(path.join(PAYMENTS, "connect-internal.ts"), connectInternalExported);
fs.writeFileSync(path.join(PAYMENTS, "connect-onboarding.ts"), connectOnboarding);
fs.writeFileSync(path.join(PAYMENTS, "payout-ledger.ts"), payoutLedger);
fs.unlinkSync(path.join(PAYMENTS, "stripe-connect.ts"));

console.log("Split stripe-connect.ts → connect-internal, connect-onboarding, payout-ledger");

import {
  BREAKTHROUGH_SESSION_PRICE_CENTS,
  MOMENTUM_SUBSCRIPTION_ANNUAL_CENTS,
  MOMENTUM_SUBSCRIPTION_MONTHLY_CENTS,
} from "@/features/booking/booking-pricing";
import type { SubscriptionBillingInterval } from "@/features/pricing/pricing-tiers-pure";

export const MOMENTUM_ROI_INCLUDED_SESSIONS_PER_YEAR = 12;

function formatCadFromCents(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export type MomentumRoiSummary = {
  interval: SubscriptionBillingInterval;
  breakthroughTwelveTotal: string;
  momentumTwelveTotal: string;
  savings: string;
  effectivePerSession: string;
  verdict: string;
  nextAction: string;
};

export function buildMomentumRoiSummary(
  interval: SubscriptionBillingInterval,
): MomentumRoiSummary {
  const sessions = MOMENTUM_ROI_INCLUDED_SESSIONS_PER_YEAR;
  const breakthroughTwelveCents = sessions * BREAKTHROUGH_SESSION_PRICE_CENTS;
  const momentumTwelveCents =
    interval === "annual"
      ? MOMENTUM_SUBSCRIPTION_ANNUAL_CENTS
      : sessions * MOMENTUM_SUBSCRIPTION_MONTHLY_CENTS;
  const savingsCents = Math.max(0, breakthroughTwelveCents - momentumTwelveCents);
  const effectivePerSessionCents = Math.round(momentumTwelveCents / sessions);

  const breakthroughTwelveTotal = formatCadFromCents(breakthroughTwelveCents);
  const momentumTwelveTotal = formatCadFromCents(momentumTwelveCents);
  const savings = formatCadFromCents(savingsCents);
  const effectivePerSession = formatCadFromCents(effectivePerSessionCents);

  const verdict =
    interval === "annual"
      ? `${sessions} Breakthrough sessions cost ${breakthroughTwelveTotal}. Momentum annual is ${momentumTwelveTotal} with ${sessions} included credits. You keep ${savings} before any perk is counted.`
      : `${sessions} Breakthrough sessions cost ${breakthroughTwelveTotal}. Momentum monthly is ${momentumTwelveTotal} per year with ${sessions} included credits. You keep ${savings} versus pay as you go.`;

  const nextAction =
    interval === "annual"
      ? `Subscribe annual at ${effectivePerSession} per included session, then book your first credit this month.`
      : `Start monthly Momentum, then use your included session credit before the month turns.`;

  return {
    interval,
    breakthroughTwelveTotal,
    momentumTwelveTotal,
    savings,
    effectivePerSession,
    verdict,
    nextAction,
  };
}

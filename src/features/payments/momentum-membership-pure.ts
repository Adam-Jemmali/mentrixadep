import {
  formatStudentBreakthroughPrice,
  formatStudentMomentumSubscriptionAnnualPrice,
  formatStudentMomentumSubscriptionMonthlyPrice,
  MOMENTUM_SUBSCRIBER_SESSION_PRICE_CENTS,
} from "@/features/booking/booking-pricing";
import { formatUsdFromCents } from "@/features/duels/duel-reward";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";

export const MOMENTUM_MEMBERSHIP_VERDICT =
  "Momentum adds Guide session perks. Your arena rank and Mastery Grid stay free.";

export const MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE =
  "Upgrade to book sessions at the member rate and unlock retest priority.";

export const MOMENTUM_MEMBERSHIP_NEXT_ACTION_ACTIVE =
  "Book your next Guide session at the member rate from the hub.";

export function momentumSubscriberSessionPriceLabel(): string {
  return `${formatUsdFromCents(MOMENTUM_SUBSCRIBER_SESSION_PRICE_CENTS)} CAD`;
}

export function momentumVsBreakthroughValueLine(): string {
  return `One Guide session is ${formatStudentBreakthroughPrice()} pay as you go. Momentum members book at ${momentumSubscriberSessionPriceLabel()} per session plus subscription perks.`;
}

export function formatMomentumRenewalLabel(
  subscription: StudentSubscriptionRow | null,
): string | null {
  if (!subscription?.current_period_end || !isMomentumSubscriptionActive(subscription)) {
    return null;
  }
  try {
    const date = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(subscription.current_period_end));
    const interval =
      subscription.billing_interval === "annual" ? "annual" : "monthly";
    if (subscription.cancel_at_period_end) {
      return `Active until ${date} (${interval}). Renewal is off.`;
    }
    return `Renews ${date} (${interval} billing).`;
  } catch {
    return null;
  }
}

export function momentumBillingPriceSummary(interval: "monthly" | "annual"): string {
  return interval === "annual"
    ? formatStudentMomentumSubscriptionAnnualPrice()
    : formatStudentMomentumSubscriptionMonthlyPrice();
}

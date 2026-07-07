import {
  formatStudentBreakthroughPrice,
  formatStudentMomentumPackPrice,
  formatStudentMomentumSubscriptionAnnualPrice,
  formatStudentMomentumSubscriptionMonthlyPrice,
  MOMENTUM_PACK_SESSION_COUNT,
  MOMENTUM_SUBSCRIBER_SESSION_PRICE_CENTS,
} from "@/features/booking/booking-pricing";
import { formatUsdFromCents } from "@/features/duels/duel-reward";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import { momentumCompRenewalLabel } from "@/features/entitlements/momentum-comp-members-pure";

export const MOMENTUM_MEMBERSHIP_MEMBER_LABEL = "Momentum membership member";

export const MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW = "Momentum membership feature";

export const MOMENTUM_MEMBERSHIP_INCLUDED_COPY = "Included with Momentum membership.";

export const MOMENTUM_MEMBERSHIP_UNLOCK_COPY = "Unlock with Momentum membership.";

export const MOMENTUM_MEMBERSHIP_VERDICT =
  "Momentum membership is the only subscription. It unlocks weekly proof, coaching memory, and included session credits. Your rank and Mastery Grid stay free in the Arena.";

export const MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE =
  "Subscribe to Momentum membership to unlock Movement Receipts, archive access, priority retests, and one included Guide session per month.";

export const MOMENTUM_MEMBERSHIP_NEXT_ACTION_ACTIVE =
  "You are a Momentum membership member. Book your next Guide session with your included monthly credit or the membership session rate.";

export function momentumSubscriberSessionPriceLabel(): string {
  return `${formatUsdFromCents(MOMENTUM_SUBSCRIBER_SESSION_PRICE_CENTS)} CAD`;
}

export function momentumVsBreakthroughValueLine(): string {
  return `One Guide session is ${formatStudentBreakthroughPrice()} pay as you go. Momentum membership members book at ${momentumSubscriberSessionPriceLabel()} per session plus subscription perks.`;
}

export function formatMomentumRenewalLabel(
  subscription: StudentSubscriptionRow | null,
  options?: { compMember?: boolean },
): string | null {
  if (options?.compMember && !isMomentumSubscriptionActive(subscription)) {
    return momentumCompRenewalLabel(true);
  }
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

export type PackGoalVerdict = {
  verdict: string;
  nextAction: string;
  recommendPack: boolean;
};

/** Exam-window pack recommendation from active student goal. */
export function buildPackGoalVerdict(input: {
  daysUntilExam: number | null;
  sessionCreditsRemaining?: number;
}): PackGoalVerdict | null {
  const days = input.daysUntilExam;
  if (days == null || days <= 0 || days > 120) return null;

  const creditsBeforeExam = Math.max(1, Math.ceil(days / 30));
  const sprintSessions = MOMENTUM_PACK_SESSION_COUNT;
  const shortfall = sprintSessions - creditsBeforeExam;

  if (shortfall <= 0) {
    return {
      verdict: `Your target date is in ${days} days. Your monthly credits cover the runway. Momentum Pack adds ${sprintSessions} sessions for ${formatStudentMomentumPackPrice()} if you want exam-window density.`,
      nextAction: "Buy the Quarter Sprint Pack only if you need more than one session per month before the exam.",
      recommendPack: false,
    };
  }

  return {
    verdict: `Your target date is in ${days} days. One credit per month leaves you ${shortfall} session${shortfall === 1 ? "" : "s"} short before the exam. Quarter Sprint Pack: ${sprintSessions} sessions for ${formatStudentMomentumPackPrice()}.`,
    nextAction:
      input.sessionCreditsRemaining && input.sessionCreditsRemaining > 0
        ? "Use your included credit first, then buy the Pack to close the gap."
        : "Buy the Quarter Sprint Pack to sprint the last miles before your target date.",
    recommendPack: true,
  };
}

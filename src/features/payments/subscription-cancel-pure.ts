import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";

export type MomentumCancelEligibility =
  | { canCancel: true; canResume: false; periodEndLabel: string | null }
  | { canCancel: false; canResume: true; periodEndLabel: string | null }
  | { canCancel: false; canResume: false; reason: string };

function formatPeriodEndLabel(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** Stripe-billed Momentum only. Comp members have no cancel path. */
export function resolveMomentumCancelEligibility(params: {
  subscription: StudentSubscriptionRow | null;
  momentumCompMember?: boolean;
}): MomentumCancelEligibility {
  if (params.momentumCompMember) {
    return {
      canCancel: false,
      canResume: false,
      reason: " Momentum membership has no Stripe billing to cancel.",
    };
  }

  const row = params.subscription;
  if (!row || !isMomentumSubscriptionActive(row)) {
    return {
      canCancel: false,
      canResume: false,
      reason: "No active Momentum subscription to cancel.",
    };
  }

  if (!row.stripe_subscription_id) {
    return {
      canCancel: false,
      canResume: false,
      reason: "Subscription billing record is incomplete. Contact support.",
    };
  }

  const periodEndLabel = formatPeriodEndLabel(row.current_period_end);

  if (row.cancel_at_period_end) {
    return { canCancel: false, canResume: true, periodEndLabel };
  }

  return { canCancel: true, canResume: false, periodEndLabel };
}

export function cancelMomentumConfirmCopy(periodEndLabel: string | null): {
  title: string;
  description: string;
  nextAction: string;
  cancelLabel: string;
  confirmLabel: string;
} {
  const until = periodEndLabel ? ` until ${periodEndLabel}` : " through the end of your paid period";
  return {
    title: "Turn off Momentum renewal?",
    description: `You keep Momentum membership${until}. No further charges after that. Already paid time is not refunded.`,
    nextAction: "Included credits and member session rate stay available until access ends.",
    cancelLabel: "Keep membership",
    confirmLabel: "Turn off renewal",
  };
}

export function resumeMomentumConfirmCopy(periodEndLabel: string | null): {
  title: string;
  description: string;
  nextAction: string;
  cancelLabel: string;
  confirmLabel: string;
} {
  const renews = periodEndLabel ? ` Renewal returns on ${periodEndLabel}.` : "";
  return {
    title: "Resume Momentum renewal?",
    description: `Your membership stays active.${renews} Billing continues on your current plan.`,
    nextAction: "You can turn renewal off again any time before the next charge.",
    cancelLabel: "Leave off",
    confirmLabel: "Resume renewal",
  };
}

export function cancelMomentumSuccessCopy(periodEndLabel: string | null): {
  verdict: string;
  nextAction: string;
} {
  return {
    verdict: periodEndLabel
      ? `Renewal is off. Momentum stays active until ${periodEndLabel}.`
      : "Renewal is off. Momentum stays active through the end of your paid period.",
    nextAction: "Book with your included credit while access remains. Resume renewal any time before it ends.",
  };
}

export function resumeMomentumSuccessCopy(periodEndLabel: string | null): {
  verdict: string;
  nextAction: string;
} {
  return {
    verdict: periodEndLabel
      ? `Renewal is on. Next bill date ${periodEndLabel}.`
      : "Renewal is on. Billing continues on your current plan.",
    nextAction: "Keep booking Guide sessions with your membership rate and included credit.",
  };
}

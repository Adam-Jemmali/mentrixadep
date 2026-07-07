import {
  BREAKTHROUGH_SESSION_PRICE_CENTS,
  formatStudentBreakthroughPrice,
  MOMENTUM_SUBSCRIBER_SESSION_PRICE_CENTS,
} from "@/features/booking/booking-pricing";
import { momentumSubscriberSessionPriceLabel } from "@/features/payments/momentum-membership-pure";
import { formatUsdFromCents } from "@/features/duels/duel-reward";

export type CheckoutPriceTier = "payg" | "member" | "credit";

export type CheckoutPriceAnchor = {
  activeTier: CheckoutPriceTier;
  paygLabel: string;
  memberLabel: string;
  creditLabel: string;
  headline: string;
  subline: string;
};

export function buildCheckoutPriceAnchor(input: {
  momentumSubscriber: boolean;
  sessionCreditAvailable: boolean;
  useSessionCredit: boolean;
  packSprintCreditsRemaining?: number;
  monthlyCreditsRemaining?: number;
}): CheckoutPriceAnchor {
  const paygLabel = formatStudentBreakthroughPrice();
  const memberLabel = momentumSubscriberSessionPriceLabel();
  const creditLabel = "$0 CAD";

  if (input.sessionCreditAvailable && input.useSessionCredit) {
    const subline =
      (input.packSprintCreditsRemaining ?? 0) > 0 &&
      (input.monthlyCreditsRemaining ?? 0) === 0
        ? "Quarter Sprint Pack credit applied. No Stripe charge today."
        : "No Stripe charge today. Your included Momentum credit covers this booking.";
    return {
      activeTier: "credit",
      paygLabel,
      memberLabel,
      creditLabel,
      headline: "Included session credit applied",
      subline,
    };
  }

  if (input.momentumSubscriber) {
    return {
      activeTier: "member",
      paygLabel,
      memberLabel,
      creditLabel,
      headline: `${formatUsdFromCents(MOMENTUM_SUBSCRIBER_SESSION_PRICE_CENTS)} Momentum membership session rate at checkout`,
      subline: input.sessionCreditAvailable
        ? (input.packSprintCreditsRemaining ?? 0) > 0
          ? "Use sprint or monthly credit at checkout. Sprint credits expire first."
          : "Check the box above to use your included credit instead."
        : "Your included credit for this month is used. Extra sessions book at the Momentum membership session rate.",
    };
  }

  return {
    activeTier: "payg",
    paygLabel,
    memberLabel,
    creditLabel,
    headline: `${formatUsdFromCents(BREAKTHROUGH_SESSION_PRICE_CENTS)} pay as you go at checkout`,
    subline: `Momentum membership members book at ${memberLabel} with an included monthly credit. Annual saves $219 on 12 sessions.`,
  };
}

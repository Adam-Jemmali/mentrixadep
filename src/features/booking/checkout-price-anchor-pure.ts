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
}): CheckoutPriceAnchor {
  const paygLabel = formatStudentBreakthroughPrice();
  const memberLabel = momentumSubscriberSessionPriceLabel();
  const creditLabel = "$0 CAD";

  if (input.sessionCreditAvailable && input.useSessionCredit) {
    return {
      activeTier: "credit",
      paygLabel,
      memberLabel,
      creditLabel,
      headline: "Included session credit applied",
      subline: "No Stripe charge today. Your monthly Momentum beat covers this booking.",
    };
  }

  if (input.momentumSubscriber) {
    return {
      activeTier: "member",
      paygLabel,
      memberLabel,
      creditLabel,
      headline: `${formatUsdFromCents(MOMENTUM_SUBSCRIBER_SESSION_PRICE_CENTS)} member rate at checkout`,
      subline: input.sessionCreditAvailable
        ? "Check the box above to use your included credit instead."
        : "Your included credit for this month is used. Extra sessions book at the member rate.",
    };
  }

  return {
    activeTier: "payg",
    paygLabel,
    memberLabel,
    creditLabel,
    headline: `${formatUsdFromCents(BREAKTHROUGH_SESSION_PRICE_CENTS)} pay as you go at checkout`,
    subline: `Momentum members book at ${memberLabel} with an included monthly credit. Annual saves $219 on 12 sessions.`,
  };
}

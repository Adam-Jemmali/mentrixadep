import {
  formatStudentBreakthroughPrice,
  formatStudentMomentumSubscriptionAnnualPrice,
  formatStudentMomentumSubscriptionMonthlyPrice,
} from "@/features/booking/booking-pricing";
import { momentumSubscriberSessionPriceLabel } from "@/features/payments/momentum-membership-pure";

export const FREE_TIER_PAYWALL_COMMITMENT =
  "Nothing here ever moves behind a paywall";

export type PricingTierId = "arena" | "breakthrough" | "momentum";

export type PricingTierDefinition = {
  id: PricingTierId;
  name: string;
  tagline: string;
  priceMain: string;
  priceSub: string;
  paywallCommitment?: string;
  /** What this tier includes. */
  receipts: string[];
  /** What this tier does not include — drives upgrade intent. */
  exclusions: string[];
  buttonText: string;
  buttonLink: string;
  popular?: boolean;
  popularBadge?: string;
};

export type TierComparisonRow = {
  feature: string;
  arena: "yes" | "no" | "paid";
  breakthrough: "yes" | "no" | "paid";
  momentum: "yes" | "no" | "paid";
  /** Highlight as Momentum-only value. */
  momentumExclusive?: boolean;
};

export const PRICING_SECTION_HEADLINE = "Three tiers. One proof.";
export const PRICING_SECTION_SUBHEAD = "Rank stays free.";
export const PRICING_SECTION_VERDICT =
  "Arena stays free. Breakthrough is one session. Momentum is the only subscription.";
export const PRICING_SECTION_NEXT_ACTION = "Pick your path.";

/** One-line Momentum value prop for landing and subscribe surfaces. */


/** Shared fun layer for Arena and Momentum — one real league rival. */
export { BEAT_LINE_CATEGORY, BEAT_LINE_SUMMARY } from "@/features/divisions/beat-line-pure";

/** Max two words per tier on visual pricing surfaces. */
export const TIER_VISUAL_BLURB: Record<PricingTierId, string> = {
  arena: "Free forever",
  breakthrough: "One session",
  momentum: "Only subscription",
};

const memberRate = momentumSubscriberSessionPriceLabel();

/** Side-by-side feature matrix for landing and subscribe surfaces. */
export function buildTierComparisonRows(): TierComparisonRow[] {
  return [
    {
      feature: "Mastery Grid + public rank",
      arena: "yes",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Unlimited practice (Calc AB)",
      arena: "yes",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Duels + verified rank",
      arena: "yes",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Beat Line: one rival, one move",
      arena: "yes",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Live Guide session",
      arena: "paid",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Pre-session brief + retest pack",
      arena: "no",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Monthly session credit",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: `Member rate. ${memberRate} vs ${formatStudentBreakthroughPrice()}`,
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Weekly Movement Receipt",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Guide memory and brief archive",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Loop credit restore",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
  ];
}

export function buildPricingTiers(): PricingTierDefinition[] {
  return [
    {
      id: "arena",
      name: "The Arena",
      tagline: "Free forever",
      priceMain: "$0",
      priceSub: "No card. No trial. No downgrade trap.",
      paywallCommitment: FREE_TIER_PAYWALL_COMMITMENT,
      receipts: [
        "Full Mastery Grid and public rank page",
        "Unlimited practice from the reviewed AP Calculus AB item bank",
        "Duels and first-answer rank",
        "Beat Line: one rival, one move",
        "Current week grid view",
      ],
      exclusions: [
        `Guide sessions: ${formatStudentBreakthroughPrice()} per session (Breakthrough) or Momentum subscription`,
        "No Movement Receipts or Guide memory across sessions",
        "No included session credits or member session rate",
      ],
      buttonText: "Start free",
      buttonLink: "/auth/signup",
    },
    {
      id: "breakthrough",
      name: "The Breakthrough",
      tagline: "One Guide session",
      priceMain: formatStudentBreakthroughPrice(),
      priceSub: "One time payment per session. No subscription.",
      receipts: [
        "One live Guide session at checkout",
        "Pre-session brief your Guide already read",
        "Follow-up pack with a scheduled retest",
        "Retest result within 7 days",
        "Accuracy guarantee: improve or it is free",
      ],
      exclusions: [
        "No included monthly credit — subscribe to Momentum for that",
        `No member rate — full ${formatStudentBreakthroughPrice()} every session unless you join Momentum`,
        "No weekly Movement Receipts or Guide memory across sessions",
      ],
      buttonText: "Find my Guide",
      buttonLink: "/auth/signup",
    },
    {
      id: "momentum",
      name: "Momentum",
      tagline: "Subscription",
      priceMain: formatStudentMomentumSubscriptionAnnualPrice(),
      priceSub: `or ${formatStudentMomentumSubscriptionMonthlyPrice()} monthly`,
      receipts: [
        "One included Guide session per month at $0 checkout when credit applies",
        `Member session rate ${momentumSubscriberSessionPriceLabel()} versus ${formatStudentBreakthroughPrice()} pay as you go`,
        "Weekly Movement Receipt by email with grid, retest, and credit status",
        "Guide memory and full brief archive across sessions",
        "Loop SLA: included credit restored if verified movement does not improve in 7 days",
      ],
      exclusions: [
        "Does not replace the Arena — rank and grid stay free without Momentum",
        "Quarter Sprint Pack (3 extra credits) is an optional add-on for active members only",
      ],
      buttonText: "Get Momentum",
      buttonLink: "/student/subscribe",
      popular: true,
      popularBadge: "Only subscription",
    },
  ];
}

export type SubscriptionBillingInterval = "monthly" | "annual";

export function subscriptionPriceLabel(interval: SubscriptionBillingInterval): string {
  return interval === "annual"
    ? formatStudentMomentumSubscriptionAnnualPrice()
    : formatStudentMomentumSubscriptionMonthlyPrice();
}

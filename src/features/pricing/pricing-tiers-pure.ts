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

export const PRICING_SECTION_HEADLINE =
  "Three ways to use Mentrixa. One thing never changes.";
export const PRICING_SECTION_SUBHEAD =
  "The Arena is free forever. Pay per Guide session when you need one call. Momentum is the only subscription.";
export const PRICING_SECTION_VERDICT =
  "Your rank and Mastery Grid never move behind a paywall. Archive, receipts, and coaching memory require Momentum.";
export const PRICING_SECTION_NEXT_ACTION =
  "Start free in the Arena. Book Breakthrough when the wall is real. Subscribe to Momentum when you want proof every week.";

const memberRate = momentumSubscriberSessionPriceLabel();

/** Side-by-side feature matrix for landing and subscribe surfaces. */
export function buildTierComparisonRows(): TierComparisonRow[] {
  return [
    {
      feature: "Mastery Grid and public rank",
      arena: "yes",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Unlimited item bank practice (AP Calculus AB)",
      arena: "yes",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Duels and verified rank",
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
      feature: "Pre-session brief and follow-up retest pack",
      arena: "no",
      breakthrough: "yes",
      momentum: "yes",
    },
    {
      feature: "Included Guide session credit",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: `Member session rate (${memberRate} vs ${formatStudentBreakthroughPrice()})`,
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Weekly Movement Receipt by email",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Mastery Grid timeline and full progress archive",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Goal pace dashboard and peer trends",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Priority retests (24h vs 48h)",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Guide memory and full brief archive",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Trajectory certificate export",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Loop SLA credit restore if movement does not improve",
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
        "Duels and Verified First Attempt rank",
        "Current week grid view",
      ],
      exclusions: [
        `Guide sessions: ${formatStudentBreakthroughPrice()} per session (Breakthrough) or Momentum subscription`,
        "No Movement Receipts, coaching archive, or trajectory certificate",
        "No included session credits or member session rate",
        "Standard retest queue only when you pay for a session",
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
        "No weekly Movement Receipts or progress archive",
        "No priority retests, Guide memory, or goal dashboard",
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
        "Priority retests 24h after session versus 48h on Breakthrough",
        "Mastery Grid timeline and full progress archive",
        "Full Loop Report with every closed coaching loop",
        "Goal pace dashboard with exam countdown and peer trends",
        "Full Guide impact receipt history",
        "Early pre-session brief 24h before your call",
        "Guide memory and full brief archive across sessions",
        "Trajectory certificate export with verified percentile",
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

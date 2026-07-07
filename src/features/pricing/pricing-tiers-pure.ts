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
export const MOMENTUM_PACKAGE_SUMMARY =
  "Playbook picks your highest-value move. Proof Chain shows what closes if you act. Weekly Movement Receipts keep the loop honest.";

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
      feature: "The Beat Line: one real league rival with guided Quest or Duel move",
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
      feature: "Momentum Playbook: one highest-value move with guided CTA",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Action Queue ranking retest, credit, and session next steps",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Proof Chain with Trajectory counterfactual on stalled loops",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "30-day Trajectory trend with peer pace and bottleneck drill-down",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Loop Velocity Index vs cohort median closure time",
      arena: "no",
      breakthrough: "no",
      momentum: "yes",
      momentumExclusive: true,
    },
    {
      feature: "Loop closure timeline with pre→post proof per Guide session",
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
        "The Beat Line: one real rival on the league board with a guided move to pass them",
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
        "The Beat Line: same real-rival chase as Arena, plus coaching intelligence on top",
        "Priority retests 24h after session versus 48h on Breakthrough",
        "Loop SLA: included credit restored if verified movement does not improve in 7 days",
        "Momentum Playbook: one highest-value move with guided next step on your hub",
        "Action Queue ranking retest, included credit, and Guide memory by value",
        "Proof Chain from intervention to verified movement with Trajectory counterfactual",
        "30-day Trajectory Index with trend, bottleneck drill-down, and peer pace",
        "Loop Velocity Index versus active Momentum cohort median closure time",
        "Weekly Movement Receipt by email with grid, retest, and credit status",
        "Full Loop Report with closure funnel and pre→post proof per Guide session",
        "Mastery Grid timeline and full progress archive",
        "Goal pace dashboard with exam countdown and peer trends",
        "Guide memory and full brief archive across sessions",
        "Full Guide Impact receipt history",
        "Early pre-session brief 24h before your call",
        "Trajectory certificate export with verified percentile",
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

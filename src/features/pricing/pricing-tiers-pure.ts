import {
  formatStudentBreakthroughPrice,
  formatStudentMomentumSubscriptionAnnualPrice,
  formatStudentMomentumSubscriptionMonthlyPrice,
} from "@/features/booking/booking-pricing";

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
  receipts: string[];
  buttonText: string;
  buttonLink: string;
  popular?: boolean;
  popularBadge?: string;
};

export const PRICING_SECTION_HEADLINE =
  "Nothing free today gets paywalled tomorrow.";
export const PRICING_SECTION_SUBHEAD =
  "The arena stays free. Guides and Momentum are optional.";
export const PRICING_SECTION_VERDICT =
  "Your rank and Mastery Grid never move behind a paywall.";
export const PRICING_SECTION_NEXT_ACTION =
  "Start free in the arena, then book a Guide when the wall is real.";

export function buildPricingTiers(): PricingTierDefinition[] {
  return [
    {
      id: "arena",
      name: "The Arena",
      tagline: "Free permanently",
      priceMain: "$0",
      priceSub: "No card required.",
      paywallCommitment: FREE_TIER_PAYWALL_COMMITMENT,
      receipts: [
        "Full Mastery Grid",
        "Unlimited approved item bank practice",
        "Public rank page",
        "Duels scoped to AP Calculus AB only",
      ],
      buttonText: "Start free",
      buttonLink: "/auth/signup",
    },
    {
      id: "breakthrough",
      name: "The Breakthrough",
      tagline: "One session",
      priceMain: formatStudentBreakthroughPrice(),
      priceSub: "One time payment per session.",
      receipts: [
        "Session brief your Guide already has",
        "Live call",
        "Follow up pack with a scheduled retest",
        "Retest result within 7 days",
        "Accuracy guarantee, improve or it is free",
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
        "Member session rate $29 versus $39 pay as you go",
        "Weekly Movement Receipt by email with grid, retest, and credit status",
        "Priority retests 24h after session versus 48h free",
        "Mastery Grid timeline and full progress archive",
        "Full Loop Report with every closed coaching loop",
        "Goal pace dashboard with exam countdown",
        "Full Guide impact receipt history",
        "Early pre-session brief 24h before your call",
        "Guide memory and full brief archive across sessions",
        "Loop SLA: included credit restored if verified movement does not improve in 7 days",
      ],
      buttonText: "Get Momentum",
      buttonLink: "/student/subscribe",
      popular: true,
      popularBadge: "Annual default",
    },
  ];
}

export type SubscriptionBillingInterval = "monthly" | "annual";

export function subscriptionPriceLabel(interval: SubscriptionBillingInterval): string {
  return interval === "annual"
    ? formatStudentMomentumSubscriptionAnnualPrice()
    : formatStudentMomentumSubscriptionMonthlyPrice();
}

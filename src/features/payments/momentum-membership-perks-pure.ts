import { buildTierComparisonRows } from "@/features/pricing/pricing-tiers-pure";
import { momentumSubscriberSessionPriceLabel } from "@/features/payments/momentum-membership-pure";
import { formatStudentBreakthroughPrice } from "@/features/booking/booking-pricing";

export const MOMENTUM_MEMBERSHIP_ONLY_BADGE = "Momentum only";

export type MomentumMembershipPerk = {
  id: string;
  feature: string;
  memberValue: string;
  href: string;
};

type PerkMeta = {
  id: string;
  memberValue: string;
  href: string;
  match: (feature: string) => boolean;
};

const PERK_META: PerkMeta[] = [
  {
    id: "monthly-session-credit",
    match: (f) => f.startsWith("Monthly session credit"),
    memberValue: "One included Guide session every month. Book before the credit expires.",
    href: "/student#browse-guides",
  },
  {
    id: "member-rate",
    match: (f) => f.startsWith("Member rate"),
    memberValue: `${momentumSubscriberSessionPriceLabel()} per extra session vs ${formatStudentBreakthroughPrice()} pay as you go.`,
    href: "/student#browse-guides",
  },
  {
    id: "weekly-movement-receipt",
    match: (f) => f === "Weekly Movement Receipt",
    memberValue: "Weekly email with what changed on your grid, retest status, and credits.",
    href: "/student/receipts",
  },
  {
    id: "guide-memory-brief-archive",
    match: (f) => f === "Guide memory + brief archive",
    memberValue: "Your Guide picks up where you left off. Past pre-session briefs stay on file.",
    href: "/student/briefs",
  },
  {
    id: "loop-sla-credit",
    match: (f) => f === "Loop SLA credit restore",
    memberValue: "Included session credit restored if a loop does not improve within 7 days.",
    href: "/student/subscribe",
  },
];

function resolvePerkMeta(feature: string): PerkMeta {
  const found = PERK_META.find((meta) => meta.match(feature));
  if (found) return found;
  return {
    id: feature.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    match: () => false,
    memberValue: "Included with Momentum membership.",
    href: "/student/subscribe",
  };
}

/** Momentum-exclusive perks from the pricing comparison table, with hub links and member value copy. */
export function buildMomentumMembershipExclusivePerks(): MomentumMembershipPerk[] {
  return buildTierComparisonRows()
    .filter((row) => row.momentumExclusive)
    .map((row) => {
      const meta = resolvePerkMeta(row.feature);
      return {
        id: meta.id,
        feature: row.feature,
        memberValue: meta.memberValue,
        href: meta.href,
      };
    });
}

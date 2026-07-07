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
    memberValue: "Weekly email with what changed on your grid vs last week.",
    href: "/student/receipts",
  },
  {
    id: "grid-timeline-archive",
    match: (f) => f === "Grid timeline + archive",
    memberValue: "Full Mastery Grid timeline and progress snapshot archive.",
    href: "/student/mastery",
  },
  {
    id: "goal-pace-peer-trends",
    match: (f) => f === "Goal pace + peer trends",
    memberValue: "Exam runway pace and how peers in your division move this week.",
    href: "/student#momentum-goal-pace",
  },
  {
    id: "playbook",
    match: (f) => f.startsWith("Playbook"),
    memberValue: "One ranked best next move from your loops, goal, and grid.",
    href: "/student#momentum-playbook",
  },
  {
    id: "action-queue",
    match: (f) => f.startsWith("Action Queue"),
    memberValue: "Every next step ranked with evidence, countdowns, and hours saved.",
    href: "/student#momentum-action-queue",
  },
  {
    id: "proof-chain",
    match: (f) => f.startsWith("Proof Chain"),
    memberValue: "Stall days on your open loop and projected rank lift if you close it.",
    href: "/student#momentum-proof-chain",
  },
  {
    id: "trajectory-30d",
    match: (f) => f.startsWith("30-day Trajectory"),
    memberValue: "30-day trajectory trend and the bottleneck slowing verified movement.",
    href: "/student#momentum-trajectory",
  },
  {
    id: "loop-velocity",
    match: (f) => f === "Loop Velocity vs cohort",
    memberValue: "How fast you close loops compared with peers in your division.",
    href: "/student#momentum-proof-chain",
  },
  {
    id: "loop-closure-timeline",
    match: (f) => f === "Loop closure timeline",
    memberValue: "Full history of every retest loop on your Mastery Grid.",
    href: "/student/loop",
  },
  {
    id: "priority-retests",
    match: (f) => f.startsWith("Priority retests"),
    memberValue: "Overdue loops surface first with 24-hour priority retest windows.",
    href: "/student#momentum-action-queue",
  },
  {
    id: "guide-memory-brief-archive",
    match: (f) => f === "Guide memory + brief archive",
    memberValue: "Guide picks up where you left off. Past pre-session briefs stay on file.",
    href: "/student/briefs",
  },
  {
    id: "trajectory-certificate",
    match: (f) => f === "Trajectory certificate",
    memberValue: "Downloadable proof of verified movement over the last 30 days.",
    href: "/student/certificate",
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

/** All Momentum-exclusive perks from the pricing comparison table, with hub links and member value copy. */
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

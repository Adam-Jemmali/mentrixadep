import type { PricingTierId } from "@/features/pricing/pricing-tiers-pure";
import { MOMENTUM_MEMBERSHIP_MEMBER_LABEL } from "@/features/payments/momentum-membership-pure";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export type MentrixaChipVisual =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "verified";

export type SessionStatusKind =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "ended"
  | "pending"
  | "rejected";

export type MentrixaChipPresentation = {
  label: string;
  visual: MentrixaChipVisual;
};

export function normalizeSessionStatus(status?: string | null): SessionStatusKind {
  const value = (status ?? "scheduled").toLowerCase();
  if (value === "completed" || value === "complete") return "completed";
  if (value === "cancelled" || value === "canceled") return "cancelled";
  if (value === "ended") return "ended";
  if (value === "pending") return "pending";
  if (value === "rejected") return "rejected";
  return "scheduled";
}

export function sessionStatusVocabIcon(status?: string | null): VocabIconName {
  switch (normalizeSessionStatus(status)) {
    case "scheduled":
      return "status-scheduled";
    case "completed":
      return "status-completed";
    case "cancelled":
      return "status-cancelled";
    case "ended":
      return "status-ended";
    case "pending":
      return "status-pending";
    case "rejected":
      return "status-rejected";
  }
}

export function sessionStatusChipPresentation(status?: string | null): MentrixaChipPresentation {
  switch (normalizeSessionStatus(status)) {
    case "scheduled":
      return { label: "Scheduled", visual: "accent" };
    case "completed":
      return { label: "Completed", visual: "default" };
    case "cancelled":
      return { label: "Cancelled", visual: "default" };
    case "ended":
      return { label: "Ended", visual: "default" };
    case "pending":
      return { label: "Pending", visual: "warning" };
    case "rejected":
      return { label: "Rejected", visual: "danger" };
  }
}

export function subscriptionTierChipPresentation(
  tier: PricingTierId,
  options?: { active?: boolean },
): MentrixaChipPresentation {
  const active = options?.active === true;
  switch (tier) {
    case "arena":
      return { label: "The Arena", visual: "accent" };
    case "breakthrough":
      return { label: "Breakthrough", visual: "accent" };
    case "momentum":
      return {
        label: active ? MOMENTUM_MEMBERSHIP_MEMBER_LABEL : "Momentum membership",
        visual: "accent",
      };
  }
}

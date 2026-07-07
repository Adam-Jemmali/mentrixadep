import { MOMENTUM_MEMBERSHIP_MEMBER_LABEL } from "@/features/payments/momentum-membership-pure";
import { SubscriptionTierChip } from "@/shared/ui/chip-patterns";
import { cn } from "@/shared/core/utils";

export function MomentumMembershipMemberChip({ className }: { className?: string }) {
  return (
    <SubscriptionTierChip
      tier="momentum"
      active
      label={MOMENTUM_MEMBERSHIP_MEMBER_LABEL}
      tone="light"
      className={cn(className)}
    />
  );
}

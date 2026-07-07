import Link from "next/link";
import { buildPricingTiers } from "@/features/pricing/pricing-tiers-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE } from "@/features/payments/momentum-membership-pure";
import { PricingTierVisualGrid } from "@/features/pricing/ui/pricing-tier-visual";
import { MomentumMembershipPerksGrid } from "@/features/student-profile/ui/momentum-membership-perks-grid";
import { cn } from "@/shared/core/utils";

/** Hub upsell — shown when the learner is not on Momentum. */
export function MomentumMembershipHubCard() {
  const momentumTier = buildPricingTiers().find((tier) => tier.id === "momentum");

  return (
    <section
      className={cn(mentrixStudent.hubSticky, "p-5 sm:p-6")}
      aria-label="Momentum membership offer"
    >
      <PricingTierVisualGrid highlight="momentum" iconSize={56} compact surface="light" className="mb-5" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className={cn(mentrixHubSurfaces.inkTitle, "text-lg")}>
            {momentumTier?.priceMain ?? "$249 CAD per year"}
          </h2>
          <p className={cn("mt-2 text-xs font-semibold", mentrixHubSurfaces.inkBody)}>
            {MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE}
          </p>
          <MomentumMembershipPerksGrid momentumActive={false} className="mt-4" />
        </div>
        <Link
          href="/student/subscribe"
          className={cn(mentrixStudent.hubBtnSolid, "shrink-0 text-center")}
        >
          View Momentum membership plan
        </Link>
      </div>
    </section>
  );
}

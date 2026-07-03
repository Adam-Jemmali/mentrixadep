import Link from "next/link";
import { buildPricingTiers } from "@/features/pricing/pricing-tiers-pure";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE } from "@/features/payments/momentum-membership-pure";
import { PricingTierVisualGrid } from "@/features/pricing/ui/pricing-tier-visual";

/** Hub upsell — shown when the learner is not on Momentum. */
export function MomentumMembershipHubCard() {
  const momentumTier = buildPricingTiers().find((tier) => tier.id === "momentum");

  return (
    <section
      className={`${mentrixBrandUi.panelMuted} p-5 sm:p-6`}
      aria-label="Momentum membership offer"
    >
      <PricingTierVisualGrid highlight="momentum" iconSize={56} compact className="mb-5" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-black italic tracking-tight text-white">
            {momentumTier?.priceMain ?? "$249 CAD per year"}
          </h2>
          <p className="mt-2 text-xs font-semibold text-violet-100">{MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE}</p>
        </div>
        <Link
          href="/student/subscribe"
          className={`${mentrixBrandUi.heroBtn} shrink-0 text-center`}
        >
          Upgrade to Momentum
        </Link>
      </div>
    </section>
  );
}

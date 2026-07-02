import Link from "next/link";
import { buildPricingTiers } from "@/features/pricing/pricing-tiers-pure";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { momentumPerkVocabIcon } from "@/features/pricing/momentum-perk-icon-pure";
import {
  MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE,
  MOMENTUM_MEMBERSHIP_VERDICT,
  momentumSubscriberSessionPriceLabel,
} from "@/features/payments/momentum-membership-pure";
import { formatStudentBreakthroughPrice } from "@/features/booking/booking-pricing";

/** Hub upsell — shown when the learner is not on Momentum. */
export function MomentumMembershipHubCard() {
  const momentumTier = buildPricingTiers().find((tier) => tier.id === "momentum");

  return (
    <section
      className={`${mentrixBrandUi.panelMuted} p-5 sm:p-6`}
      aria-label="Momentum membership offer"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MentrixaVocabIcon name="momentum" size={16} surface="dark" title="Momentum" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
              Momentum package
            </p>
          </div>
          <h2 className="mt-2 text-lg font-black italic tracking-tight text-white">
            {momentumTier?.priceMain ?? "$249 CAD per year"}
          </h2>
          <p className="mt-1 text-xs text-violet-200/85">{momentumTier?.priceSub}</p>
          <p className="mt-3 text-sm text-violet-100/90">{MOMENTUM_MEMBERSHIP_VERDICT}</p>
          <p className="mt-2 text-xs text-violet-200/75">
            Pay as you go sessions are {formatStudentBreakthroughPrice()}. Members book at{" "}
            {momentumSubscriberSessionPriceLabel()}.
          </p>
          {momentumTier ? (
            <ul className="mt-3 space-y-1.5">
              {momentumTier.receipts.map((receipt) => (
                <li key={receipt} className="flex items-start gap-2 text-xs text-violet-100/90">
                  <MentrixaVocabIcon
                    name={momentumPerkVocabIcon(receipt)}
                    size={14}
                    surface="dark"
                    title={receipt}
                  />
                  <span>{receipt}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs font-semibold text-violet-100">{MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE}</p>
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

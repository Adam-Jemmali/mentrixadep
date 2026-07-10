"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { momentumPerkVocabIcon } from "@/features/pricing/momentum-perk-icon-pure";
import { cn } from "@/shared/core/utils";
import {
  buildPricingTiers,
  MOMENTUM_PACKAGE_SUMMARY,
  subscriptionPriceLabel,
  type SubscriptionBillingInterval,
} from "@/features/pricing/pricing-tiers-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import {
  formatMomentumRenewalLabel,
  MOMENTUM_MEMBERSHIP_NEXT_ACTION_ACTIVE,
  MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE,
} from "@/features/payments/momentum-membership-pure";
import { buildMomentumRoiSummary } from "@/features/pricing/momentum-roi-pure";
import type { PackSprintState } from "@/features/entitlements/pack-sprint-pure";
import { buildSessionCreditsHubVerdict } from "@/features/entitlements/session-credits-display-pure";
import { SubscriptionTierChip } from "@/shared/ui/chip-patterns";
import { MomentumSubscriptionDisclosure, MomentumLoopSlaDisclosure } from "@/shared/ui/disclosure-patterns";
import { MentrixaBillingIntervalRadioGroup } from "@/shared/ui/radio-group-patterns";
import { PricingTierIcon, PricingTierVisualGrid } from "@/features/pricing/ui/pricing-tier-visual";
import { MomentumCancelControls } from "@/features/student-profile/ui/momentum-cancel-controls";

type MomentumMembershipPanelProps = {
  subscription: StudentSubscriptionRow | null;
  momentumActive?: boolean;
  momentumCompMember?: boolean;
  sessionCreditsRemaining?: number;
  sessionCreditPeriodMonth?: string | null;
  packSprint?: PackSprintState | null;
  monthlyCreditsRemaining?: number;
  variant?: "profile" | "subscribe";
  interval?: SubscriptionBillingInterval;
  onIntervalChange?: (interval: SubscriptionBillingInterval) => void;
  onStartCheckout?: () => void;
  checkoutPending?: boolean;
  checkoutSuccess?: boolean;
  className?: string;
};

export function MomentumMembershipPanel({
  subscription,
  momentumActive,
  momentumCompMember = false,
  sessionCreditsRemaining = 0,
  sessionCreditPeriodMonth = null,
  packSprint = null,
  monthlyCreditsRemaining = 0,
  variant = "profile",
  interval = "annual",
  onIntervalChange,
  onStartCheckout,
  checkoutPending = false,
  checkoutSuccess = false,
  className,
}: MomentumMembershipPanelProps) {
  const stripeActive = isMomentumSubscriptionActive(subscription);
  const active = checkoutSuccess || momentumActive === true || (momentumActive === undefined && stripeActive);
  const momentumTier = buildPricingTiers().find((tier) => tier.id === "momentum");
  const renewal = formatMomentumRenewalLabel(subscription, { compMember: momentumCompMember });
  const isSubscribe = variant === "subscribe";
  const roi = !active ? buildMomentumRoiSummary(interval) : null;
  const creditsCopy =
    active
      ? buildSessionCreditsHubVerdict({
          totalRemaining: sessionCreditsRemaining,
          monthlyRemaining: monthlyCreditsRemaining,
          packSprint,
          periodMonth: sessionCreditPeriodMonth,
        })
      : null;

  const shellClass = cn(mentrixStudent.hubSticky, "p-5 sm:p-8", className);

  return (
    <section className={shellClass} aria-label="Momentum membership">
      {isSubscribe ? (
        <>
          <PricingTierVisualGrid highlight="momentum" iconSize={88} compact surface="light" className="mb-8" />
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#C4B5FD] pb-6">
            <div className="min-w-0">
              <SubscriptionTierChip tier="momentum" active={active} />
              <h2 className={cn(mentrixHubSurfaces.inkTitle, "mt-3 text-2xl")}>
                {momentumTier?.name ?? "Momentum"}
              </h2>
              <p className="mt-2 text-2xl font-bold tabular-nums text-[#4F46E5]">
                {subscriptionPriceLabel(interval)}
              </p>
            </div>
            <PricingTierIcon tier="momentum" size={64} />
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SubscriptionTierChip tier="momentum" active={active} />
              {momentumTier?.popularBadge ? (
                <span className="rounded-full bg-[#7C3AED] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  {momentumTier.popularBadge}
                </span>
              ) : null}
            </div>
            <h2 className={cn(mentrixHubSurfaces.inkTitle, "mt-3 text-2xl")}>
              {momentumTier?.name ?? "Momentum"}
            </h2>
            <p className={cn("mt-1 text-sm font-medium", mentrixHubSurfaces.inkMuted)}>
              {momentumTier?.tagline}
            </p>
          </div>
          <PricingTierIcon tier="momentum" size={32} />
        </div>
      )}

      {roi && isSubscribe ? (
        <div className="mt-5 grid gap-2 rounded-2xl border border-[#C4B5FD] bg-white/75 p-4 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <PricingTierIcon tier="breakthrough" size={40} />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#64748B]">Breakthrough</p>
            <p className="mt-1 font-bold tabular-nums text-[#0B1220]">{roi.breakthroughTwelveTotal}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <PricingTierIcon tier="momentum" size={40} />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#64748B]">Momentum</p>
            <p className="mt-1 font-bold tabular-nums text-[#4F46E5]">{roi.momentumTwelveTotal}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">You keep</p>
            <p className="mt-1 font-bold tabular-nums text-[#0B1220]">{roi.savings}</p>
          </div>
        </div>
      ) : null}

      {isSubscribe && !active && onIntervalChange ? (
        <div className="mt-5">
          <MentrixaBillingIntervalRadioGroup value={interval} onChange={onIntervalChange} />
        </div>
      ) : null}

      {momentumTier && isSubscribe ? (
        <>
          <p className={cn("mt-5 text-sm font-semibold", mentrixHubSurfaces.inkBody)}>
            {MOMENTUM_PACKAGE_SUMMARY}
          </p>
          <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#6366F1]">
            What&apos;s included
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {momentumTier.receipts.map((receipt) => (
              <li key={receipt} className={cn("flex items-center gap-2.5 text-xs", mentrixHubSurfaces.inkBody)}>
                <MentrixaVocabIcon
                  name={momentumPerkVocabIcon(receipt)}
                  size={20}
                  surface="light"
                  title={receipt}
                />
                <span>{receipt}</span>
              </li>
            ))}
          </ul>
        </>
      ) : momentumTier ? (
        <ul className="mt-5 space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#6366F1]">What you get</p>
          {momentumTier.receipts.map((receipt) => (
            <li key={receipt} className={cn("flex items-start gap-2.5 text-sm", mentrixHubSurfaces.inkBody)}>
              <MentrixaVocabIcon
                name={momentumPerkVocabIcon(receipt)}
                size={16}
                surface="light"
                className="mt-0.5 shrink-0"
                title={receipt}
              />
              <span>{receipt}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 space-y-3">
        <MomentumSubscriptionDisclosure />
        <MomentumLoopSlaDisclosure />
      </div>

      {active && renewal ? (
        <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {renewal}
        </p>
      ) : null}

      {active && creditsCopy ? (
        <div className="mt-4 space-y-2">
          <p className="rounded-xl border border-[#C4B5FD] bg-white/80 px-4 py-3 text-sm font-medium text-[#334155]">
            {creditsCopy.verdict}
          </p>
          <p className={cn("text-sm", mentrixHubSurfaces.inkMuted)}>{creditsCopy.nextAction}</p>
        </div>
      ) : null}

      <p className={cn("mt-4 text-sm font-semibold", mentrixHubSurfaces.inkBody)}>
        {active ? MOMENTUM_MEMBERSHIP_NEXT_ACTION_ACTIVE : MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE}
      </p>

      {isSubscribe && !active ? (
        <p
          className="mt-4 rounded-xl border-2 border-[#7C3AED] bg-white px-4 py-3 text-sm font-bold text-[#4F46E5]"
          aria-live="polite"
        >
          {interval === "annual"
            ? "Checkout will bill you annually at $249 CAD per year."
            : "Checkout will bill you monthly at $29 CAD per month."}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {active ? (
          <>
            <Button asChild variant="outline" className="border-[#6366F1] text-[#4F46E5] hover:bg-[#EDE9FE]">
              <Link href="/student#browse-guides">Book a Guide session</Link>
            </Button>
            {!isSubscribe ? (
              <Button asChild variant="ghost" className="text-[#4F46E5] hover:bg-[#EDE9FE]">
                <Link href="/student/subscribe">Manage plan</Link>
              </Button>
            ) : null}
          </>
        ) : isSubscribe && onStartCheckout ? (
          <Button type="button" className={mentrixStudent.hubBtnSolid} onClick={onStartCheckout} disabled={checkoutPending}>
            {checkoutPending ? "Opening Stripe…" : "Subscribe"}
          </Button>
        ) : (
          <Button asChild className={mentrixStudent.hubBtnSolid}>
            <Link href="/student/subscribe">View Momentum membership plan</Link>
          </Button>
        )}
        {!isSubscribe ? (
          <Button asChild variant="outline" className="border-[#6366F1] text-[#4F46E5] hover:bg-[#EDE9FE]">
            <Link href="/student/subscribe">View full plan</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="border-[#6366F1] text-[#4F46E5] hover:bg-[#EDE9FE]">
            <Link href="/student">Back to hub</Link>
          </Button>
        )}
      </div>

      {active ? (
        <MomentumCancelControls
          subscription={subscription}
          momentumCompMember={momentumCompMember}
          className="mt-4"
        />
      ) : null}
    </section>
  );
}

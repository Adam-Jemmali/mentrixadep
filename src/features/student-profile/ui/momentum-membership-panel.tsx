"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { momentumPerkVocabIcon } from "@/features/pricing/momentum-perk-icon-pure";
import { cn } from "@/shared/core/utils";
import {
  buildPricingTiers,
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

type MomentumMembershipPanelProps = {
  subscription: StudentSubscriptionRow | null;
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
  const active = checkoutSuccess || isMomentumSubscriptionActive(subscription);
  const momentumTier = buildPricingTiers().find((tier) => tier.id === "momentum");
  const renewal = formatMomentumRenewalLabel(subscription);
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

  const shellClass = isSubscribe
    ? `${mentrixBrandUi.panel} rounded-[2rem] p-6 sm:p-8`
    : "rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/40 p-6 shadow-[0_24px_48px_-24px_rgba(79,70,229,0.25)] sm:p-8";

  return (
    <section className={cn(shellClass, className)} aria-label="Momentum membership">
      {isSubscribe ? (
        <>
          <PricingTierVisualGrid highlight="momentum" iconSize={88} compact className="mb-8" />
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-500/25 pb-6">
            <div className="min-w-0">
              <SubscriptionTierChip tier="momentum" active={active} />
              <h2 className="mt-3 text-2xl font-black italic tracking-tight text-white">
                {momentumTier?.name ?? "Momentum"}
              </h2>
              <p className="mt-2 text-2xl font-bold tabular-nums text-violet-50">
                {subscriptionPriceLabel(interval)}
              </p>
            </div>
            <PricingTierIcon tier="momentum" size={64} />
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
              Only subscription
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SubscriptionTierChip tier="momentum" active={active} />
              {momentumTier?.popularBadge ? (
                <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  {momentumTier.popularBadge}
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-2xl font-black italic tracking-tight text-indigo-950">
              {momentumTier?.name ?? "Momentum"}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">{momentumTier?.tagline}</p>
          </div>
          <PricingTierIcon tier="momentum" size={32} />
        </div>
      )}

      {roi && isSubscribe ? (
        <div className="mt-5 grid gap-2 rounded-2xl border border-violet-500/30 bg-violet-950/40 p-4 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <PricingTierIcon tier="breakthrough" size={40} />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-violet-300/80">Breakthrough</p>
            <p className="mt-1 font-bold tabular-nums text-white">{roi.breakthroughTwelveTotal}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <PricingTierIcon tier="momentum" size={40} />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-violet-300/80">Momentum</p>
            <p className="mt-1 font-bold tabular-nums text-violet-50">{roi.momentumTwelveTotal}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-300/80">You keep</p>
            <p className="mt-1 font-bold tabular-nums text-violet-50">{roi.savings}</p>
          </div>
        </div>
      ) : null}

      {isSubscribe && !active && onIntervalChange ? (
        <div className="mt-5">
          <MentrixaBillingIntervalRadioGroup value={interval} onChange={onIntervalChange} />
        </div>
      ) : null}

      {momentumTier && isSubscribe ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {momentumTier.receipts.slice(0, 8).map((receipt) => (
            <li key={receipt} className="flex items-center gap-2.5 text-xs text-violet-100/90">
              <MentrixaVocabIcon
                name={momentumPerkVocabIcon(receipt)}
                size={20}
                surface="dark"
                title={receipt}
              />
              <span className="line-clamp-2">{receipt}</span>
            </li>
          ))}
        </ul>
      ) : momentumTier ? (
        <ul className="mt-5 space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">What you get</p>
          {momentumTier.receipts.map((receipt) => (
            <li key={receipt} className="flex items-start gap-2.5 text-sm text-slate-800">
              <MentrixaVocabIcon
                name={momentumPerkVocabIcon(receipt)}
                size={16}
                className="mt-0.5 shrink-0 text-indigo-600"
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
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
          {renewal}
        </p>
      ) : null}

      {active && creditsCopy ? (
        <div className="mt-4 space-y-2">
          <p className="rounded-xl border border-indigo-500/30 bg-indigo-950/50 px-4 py-3 text-sm font-medium text-violet-50">
            {creditsCopy.verdict}
          </p>
          <p className="text-sm text-violet-200/90">{creditsCopy.nextAction}</p>
        </div>
      ) : null}

      <p className={cn("mt-4 text-sm font-semibold", isSubscribe ? "text-violet-100" : "text-indigo-900")}>
        {active ? MOMENTUM_MEMBERSHIP_NEXT_ACTION_ACTIVE : MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {active ? (
          <>
            <Button asChild variant="outline">
              <Link href="/student#browse-guides">Book a Guide session</Link>
            </Button>
            {!isSubscribe ? (
              <Button asChild variant="outline">
                <Link href="/student/certificate">Trajectory certificate</Link>
              </Button>
            ) : null}
            {!isSubscribe ? (
              <Button asChild variant="ghost">
                <Link href="/student/subscribe">Manage plan</Link>
              </Button>
            ) : null}
          </>
        ) : isSubscribe && onStartCheckout ? (
          <Button type="button" onClick={onStartCheckout} disabled={checkoutPending}>
            {checkoutPending ? "Opening Stripe…" : "Subscribe with Stripe"}
          </Button>
        ) : (
          <Button asChild>
            <Link href="/student/subscribe">Upgrade to Momentum</Link>
          </Button>
        )}
        {!isSubscribe ? (
          <Button asChild variant="outline">
            <Link href="/student/subscribe">View full plan</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/student">Back to hub</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

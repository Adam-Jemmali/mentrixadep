"use client";

import Link from "next/link";
import { Check, Trophy } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";
import {
  buildPricingTiers,
  PRICING_SECTION_VERDICT,
  subscriptionPriceLabel,
  type SubscriptionBillingInterval,
} from "@/features/pricing/pricing-tiers-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import {
  formatMomentumRenewalLabel,
  MOMENTUM_MEMBERSHIP_NEXT_ACTION_ACTIVE,
  MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE,
  MOMENTUM_MEMBERSHIP_VERDICT,
  momentumSubscriberSessionPriceLabel,
  momentumVsBreakthroughValueLine,
} from "@/features/payments/momentum-membership-pure";
import { formatStudentBreakthroughPrice } from "@/features/booking/booking-pricing";
import { buildMomentumRoiSummary } from "@/features/pricing/momentum-roi-pure";
import { trajectoryIndexSocialProofLine } from "@/features/trajectory-index/trajectory-index-pure";
import { SubscriptionTierChip } from "@/shared/ui/chip-patterns";
import { MomentumSubscriptionDisclosure } from "@/shared/ui/disclosure-patterns";
import { MentrixaBillingIntervalRadioGroup } from "@/shared/ui/radio-group-patterns";

type MomentumMembershipPanelProps = {
  subscription: StudentSubscriptionRow | null;
  sessionCreditsRemaining?: number;
  sessionCreditPeriodMonth?: string | null;
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

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/40 p-6 shadow-[0_24px_48px_-24px_rgba(79,70,229,0.25)] sm:p-8",
        className,
      )}
      aria-label="Momentum membership"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
            Package plan
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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-sm">
          <Trophy className="h-6 w-6 text-indigo-600" aria-hidden />
        </div>
      </div>

      <p className="mt-4 text-sm font-medium leading-relaxed text-slate-700">{MOMENTUM_MEMBERSHIP_VERDICT}</p>
      <p className="mt-2 text-sm italic text-slate-500">{PRICING_SECTION_VERDICT}</p>

      <div className="mt-4 rounded-2xl border border-indigo-100 bg-white/80 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compare</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Breakthrough</p>
            <p className="mt-1 text-lg font-black text-slate-900">{formatStudentBreakthroughPrice()}</p>
            <p className="mt-1 text-xs text-slate-500">One time per Guide session at checkout.</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Momentum</p>
            <p className="mt-1 text-lg font-black text-indigo-950">
              {subscriptionPriceLabel(interval)}
            </p>
            <p className="mt-1 text-xs text-indigo-800/80">
              Plus {momentumSubscriberSessionPriceLabel()} member session rate.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-600">{momentumVsBreakthroughValueLine()}</p>
        {!active ? (
          <p className="mt-3 text-xs leading-relaxed text-indigo-800/90">
            {trajectoryIndexSocialProofLine(50)}
          </p>
        ) : null}
      </div>

      {roi && isSubscribe ? (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">
            Twelve session value
          </p>
          <div className="mt-3 grid gap-2 text-sm text-slate-800 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">12 Breakthrough sessions</p>
              <p className="font-bold tabular-nums">{roi.breakthroughTwelveTotal}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Momentum ({interval})</p>
              <p className="font-bold tabular-nums text-indigo-950">{roi.momentumTwelveTotal}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">You keep</p>
              <p className="font-bold tabular-nums text-indigo-950">{roi.savings}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Effective included session cost: {roi.effectivePerSession} per year.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900">{roi.verdict}</p>
          <p className="mt-1 text-sm text-slate-600">{roi.nextAction}</p>
        </div>
      ) : null}

      {isSubscribe && !active && onIntervalChange ? (
        <div className="mt-5">
          <MentrixaBillingIntervalRadioGroup value={interval} onChange={onIntervalChange} />
        </div>
      ) : null}

      {momentumTier ? (
        <ul className="mt-5 space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">What you get</p>
          {momentumTier.receipts.map((receipt) => (
            <li key={receipt} className="flex items-start gap-2.5 text-sm text-slate-800">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
              <span>{receipt}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <MomentumSubscriptionDisclosure />
      </div>

      {active && renewal ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {renewal}
        </p>
      ) : null}

      {active ? (
        <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">
          {sessionCreditsRemaining > 0
            ? `${sessionCreditsRemaining} included session credit${sessionCreditsRemaining === 1 ? "" : "s"} available${sessionCreditPeriodMonth ? ` for ${sessionCreditPeriodMonth.slice(0, 7)}` : ""}.`
            : "Your included session credit for this month is used. Extra sessions book at the member rate."}
        </p>
      ) : null}

      <p className="mt-4 text-sm font-semibold text-indigo-900">
        {active ? MOMENTUM_MEMBERSHIP_NEXT_ACTION_ACTIVE : MOMENTUM_MEMBERSHIP_NEXT_ACTION_INACTIVE}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {active ? (
          <>
            <Button asChild variant="outline">
              <Link href="/student#browse-guides">Book a Guide session</Link>
            </Button>
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

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { formatStudentBreakthroughPrice, formatStudentMomentumPackPrice, MOMENTUM_PACK_SESSION_COUNT } from "@/features/booking/booking-pricing";
import type { SubscriptionBillingInterval } from "@/features/pricing/pricing-tiers-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import type { PackSprintState } from "@/features/entitlements/pack-sprint-pure";
import { buildPackGoalVerdict } from "@/features/payments/momentum-membership-pure";
import { SubscriptionStateAlert } from "@/shared/ui/alert-patterns";
import { StripeCheckoutPendingPanel } from "@/shared/ui/spinner-patterns";
import { Button } from "@/shared/ui/button";
import { MomentumMembershipPanel } from "@/features/student-profile/ui/momentum-membership-panel";
import { TierComparisonTable } from "@/features/pricing/ui/tier-comparison-table";
import { PricingTierIcon } from "@/features/pricing/ui/pricing-tier-visual";

export function MomentumSubscribeClient({
  initialSubscription,
  sessionCreditsRemaining = 0,
  sessionCreditPeriodMonth = null,
  momentumActive = false,
  daysUntilExam = null,
  packSprint = null,
  monthlyCreditsRemaining = 0,
}: {
  initialSubscription: StudentSubscriptionRow | null;
  sessionCreditsRemaining?: number;
  sessionCreditPeriodMonth?: string | null;
  momentumActive?: boolean;
  daysUntilExam?: number | null;
  packSprint?: PackSprintState | null;
  monthlyCreditsRemaining?: number;
}) {
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<SubscriptionBillingInterval>("annual");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const packGoal = buildPackGoalVerdict({
    daysUntilExam,
    sessionCreditsRemaining,
  });

  async function startCheckout() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout");
    } finally {
      setPending(false);
    }
  }

  async function startPackCheckout() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/momentum-pack/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start pack checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start pack checkout");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={`${mentrixStudent.main} relative z-10`}>
        <MomentumMembershipPanel
          subscription={initialSubscription}
          sessionCreditsRemaining={sessionCreditsRemaining}
          sessionCreditPeriodMonth={sessionCreditPeriodMonth}
          packSprint={packSprint}
          monthlyCreditsRemaining={monthlyCreditsRemaining}
          variant="subscribe"
          interval={interval}
          onIntervalChange={setInterval}
          onStartCheckout={() => void startCheckout()}
          checkoutPending={pending}
          checkoutSuccess={success}
          className="mx-auto max-w-4xl"
        />

        <div className="mx-auto mt-8 max-w-4xl">
          <TierComparisonTable variant="dark" />
        </div>

        {momentumActive ? (
          <div className={`${mentrixBrandUi.panel} mx-auto mt-8 max-w-2xl rounded-2xl p-5`}>
            <div className="flex items-center gap-3">
              <PricingTierIcon tier="momentum" size={48} title="Momentum Pack" />
              <div>
                <p className="text-sm font-semibold text-white">Quarter Sprint Pack</p>
                <p className="text-xs text-violet-200/80">Extra credits</p>
              </div>
            </div>
            {packGoal ? (
              <p className="mt-3 text-sm font-medium text-violet-100">{packGoal.verdict}</p>
            ) : (
              <p className="mt-3 text-sm text-violet-200/90">
                {MOMENTUM_PACK_SESSION_COUNT} sessions · {formatStudentMomentumPackPrice()}
              </p>
            )}
            <Button type="button" className="mt-4" onClick={() => void startPackCheckout()} disabled={pending}>
              Buy Quarter Sprint Pack
            </Button>
            <p className="mt-2 text-[10px] text-violet-300/60">
              Pay as you go is {formatStudentBreakthroughPrice()} without Momentum.
            </p>
          </div>
        ) : null}

        {success ? (
          <div className="mx-auto mt-5 max-w-2xl">
            <SubscriptionStateAlert kind="success" />
          </div>
        ) : null}
        {canceled ? (
          <div className="mx-auto mt-5 max-w-2xl">
            <SubscriptionStateAlert kind="canceled" />
          </div>
        ) : null}
        {error ? (
          <div className="mx-auto mt-5 max-w-2xl">
            <SubscriptionStateAlert kind="checkout_error" error={error} />
          </div>
        ) : null}
        {pending ? (
          <div className="mx-auto mt-5 max-w-2xl">
            <StripeCheckoutPendingPanel />
          </div>
        ) : null}
      </main>
    </div>
  );
}

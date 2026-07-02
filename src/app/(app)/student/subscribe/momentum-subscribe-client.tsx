"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { formatStudentBreakthroughPrice, formatStudentMomentumPackPrice, MOMENTUM_PACK_SESSION_COUNT } from "@/features/booking/booking-pricing";
import type { SubscriptionBillingInterval } from "@/features/pricing/pricing-tiers-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { buildPackGoalVerdict } from "@/features/payments/momentum-membership-pure";
import { SubscriptionStateAlert } from "@/shared/ui/alert-patterns";
import { StripeCheckoutPendingPanel } from "@/shared/ui/spinner-patterns";
import { Button } from "@/shared/ui/button";
import { MomentumMembershipPanel } from "@/features/student-profile/ui/momentum-membership-panel";

export function MomentumSubscribeClient({
  initialSubscription,
  sessionCreditsRemaining = 0,
  sessionCreditPeriodMonth = null,
  momentumActive = false,
  daysUntilExam = null,
}: {
  initialSubscription: StudentSubscriptionRow | null;
  sessionCreditsRemaining?: number;
  sessionCreditPeriodMonth?: string | null;
  momentumActive?: boolean;
  daysUntilExam?: number | null;
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
    <main className={mentrixStudent.main}>
      <MomentumMembershipPanel
        subscription={initialSubscription}
        sessionCreditsRemaining={sessionCreditsRemaining}
        sessionCreditPeriodMonth={sessionCreditPeriodMonth}
        variant="subscribe"
        interval={interval}
        onIntervalChange={setInterval}
        onStartCheckout={() => void startCheckout()}
        checkoutPending={pending}
        checkoutSuccess={success}
        className="mx-auto max-w-2xl"
      />

      {momentumActive ? (
        <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-indigo-100 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Quarter Sprint Pack</p>
          {packGoal ? (
            <>
              <p className="mt-2 text-sm font-medium text-slate-900">{packGoal.verdict}</p>
              <p className="mt-1 text-sm text-slate-600">{packGoal.nextAction}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              Momentum Pack: {MOMENTUM_PACK_SESSION_COUNT} sessions for {formatStudentMomentumPackPrice()}.
              Pay as you go is {formatStudentBreakthroughPrice()} per session.
            </p>
          )}
          <Button type="button" className="mt-4" onClick={() => void startPackCheckout()} disabled={pending}>
            Buy Momentum Pack
          </Button>
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
  );
}

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { SubscriptionBillingInterval } from "@/features/pricing/pricing-tiers-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { SubscriptionStateAlert } from "@/shared/ui/alert-patterns";
import { StripeCheckoutPendingPanel } from "@/shared/ui/spinner-patterns";
import { MomentumMembershipPanel } from "@/features/student-profile/ui/momentum-membership-panel";

export function MomentumSubscribeClient({
  initialSubscription,
}: {
  initialSubscription: StudentSubscriptionRow | null;
}) {
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<SubscriptionBillingInterval>("annual");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

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

  return (
    <main className={mentrixStudent.main}>
      <MomentumMembershipPanel
        subscription={initialSubscription}
        variant="subscribe"
        interval={interval}
        onIntervalChange={setInterval}
        onStartCheckout={() => void startCheckout()}
        checkoutPending={pending}
        checkoutSuccess={success}
        className="mx-auto max-w-2xl"
      />

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

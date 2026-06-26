"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  buildPricingTiers,
  subscriptionPriceLabel,
  PRICING_SECTION_VERDICT,
  type SubscriptionBillingInterval,
} from "@/features/pricing/pricing-tiers-pure";
import { SubscriptionStateAlert } from "@/shared/ui/alert-patterns";
import { MomentumSubscriptionDisclosure } from "@/shared/ui/disclosure-patterns";
import { SubscriptionTierChip } from "@/shared/ui/chip-patterns";
import { StripeCheckoutPendingPanel } from "@/shared/ui/spinner-patterns";
import { MentrixaBillingIntervalRadioGroup } from "@/shared/ui/radio-group-patterns";

export function MomentumSubscribeClient() {
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<SubscriptionBillingInterval>("annual");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const momentumTier = buildPricingTiers().find((tier) => tier.id === "momentum");
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
      <section className={`${mentrixStudent.card} mx-auto max-w-xl p-6 sm:p-8`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
          Momentum subscription
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SubscriptionTierChip tier="momentum" active={success} />
        </div>
        <h1 className={`mt-2 text-2xl font-bold ${mentrixStudent.textOnLight}`}>
          {momentumTier?.name ?? "Momentum"}
        </h1>
        <p className={`mt-2 text-sm ${mentrixStudent.textMutedOnLight}`}>
          {PRICING_SECTION_VERDICT}
        </p>
        <div className="mt-4">
          <MomentumSubscriptionDisclosure />
        </div>

        <div className="mt-6">
          <MentrixaBillingIntervalRadioGroup value={interval} onChange={setInterval} />
        </div>

        <p className="mt-4 text-3xl font-bold text-slate-900">{subscriptionPriceLabel(interval)}</p>

        {momentumTier ? (
          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            {momentumTier.receipts.map((receipt) => (
              <li key={receipt}>{receipt}</li>
            ))}
          </ul>
        ) : null}

        {success ? (
          <div className="mt-5">
            <SubscriptionStateAlert kind="success" />
          </div>
        ) : null}
        {canceled ? (
          <div className="mt-5">
            <SubscriptionStateAlert kind="canceled" />
          </div>
        ) : null}
        {error ? (
          <div className="mt-5">
            <SubscriptionStateAlert kind="checkout_error" error={error} />
          </div>
        ) : null}

        {pending ? (
          <div className="mt-6">
            <StripeCheckoutPendingPanel />
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void startCheckout()}>
              Subscribe with Stripe
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/student">Back to hub</Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

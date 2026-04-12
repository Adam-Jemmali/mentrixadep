"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StripeRefreshPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/stripe/connect/create", {
          method: "POST",
          credentials: "include",
        });
        const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

        if (!res.ok || !body.url) {
          throw new Error(body.error ?? "Failed to create Stripe onboarding link");
        }

        if (!cancelled) {
          window.location.assign(body.url);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to start Stripe onboarding");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Connecting Stripe</h1>
      <p className="mt-3 text-sm text-slate-600">
        Preparing your Stripe onboarding session. You will be redirected automatically.
      </p>
      {error ? (
        <p className="mt-4 max-w-lg text-left text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      ) : null}
      <button
        type="button"
        className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        onClick={() => router.refresh()}
      >
        Retry
      </button>
    </div>
  );
}
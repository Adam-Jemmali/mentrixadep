"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BookSessionButtonPublicProps {
  availabilityId: string;
  onBusyChange?: (busy: boolean) => void;
}

export function BookSessionButtonPublic({ availabilityId, onBusyChange }: BookSessionButtonPublicProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBook() {
    setLoading(true);
    onBusyChange?.(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityId }),
      });

      if (res.status === 401) {
        onBusyChange?.(false);
        const returnUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/auth/signin?signin=1&redirect=${returnUrl}`;
        return;
      }

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to start checkout");
        setLoading(false);
        onBusyChange?.(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book session");
      setLoading(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:items-end sm:w-auto">
      {error ? (
        <p className="text-sm text-red-700 font-medium leading-snug sm:max-w-[220px] sm:text-right">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        onClick={handleBook}
        disabled={loading}
        className="min-h-11 w-full min-w-[148px] bg-mentrixa-600 text-white shadow-md hover:bg-mentrixa-700 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-mentrixa-600 focus-visible:ring-offset-2 disabled:bg-slate-500 disabled:text-white disabled:opacity-100 sm:w-auto"
      >
        {loading ? "Redirecting…" : "Pay & book"}
      </Button>
    </div>
  );
}

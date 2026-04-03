"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BookSessionButtonProps {
  availabilityId: string;
  /** Fires when checkout redirect starts (true) or after an error (false). */
  onBusyChange?: (busy: boolean) => void;
}

export function BookSessionButton({ availabilityId, onBusyChange }: BookSessionButtonProps) {
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

      const data = (await res.json()) as {
        url?: string;
        error?: string;
      };

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
        <p className="text-sm font-medium leading-snug text-red-800 sm:max-w-[260px] sm:text-right">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        onClick={handleBook}
        disabled={loading}
        className="min-h-10 w-full min-w-[148px] bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:bg-slate-400 disabled:text-white disabled:opacity-100 sm:w-auto"
      >
        {loading ? "Redirecting…" : "Pay & book"}
      </Button>
    </div>
  );
}

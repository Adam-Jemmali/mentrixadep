"use client";

import { useState } from "react";

interface BookSessionButtonPublicProps {
  availabilityId: string;
}

export function BookSessionButtonPublic({ availabilityId }: BookSessionButtonPublicProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBook() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityId }),
      });

      // 401 = not signed in → redirect to sign-in, then back here
      if (res.status === 401) {
        const returnUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/auth/signin?redirect=${returnUrl}`;
        return;
      }

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to start checkout");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book session");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 max-w-[160px] text-right font-medium">
          {error}
        </p>
      )}
      <button
        onClick={handleBook}
        disabled={loading}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow transition-all"
      >
        {loading ? "Redirecting…" : "Book Session"}
      </button>
    </div>
  );
}

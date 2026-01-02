"use client";

import { useState } from "react";
import { bookSession } from "@/app/actions/student";
import { useRouter } from "next/navigation";

interface BookSessionButtonProps {
  availabilityId: string;
}

export function BookSessionButton({ availabilityId }: BookSessionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleBook() {
    setLoading(true);
    setError(null);

    try {
      await bookSession(availabilityId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book session");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 max-w-[150px] text-right font-medium">
          {error}
        </p>
      )}
      <button
        onClick={handleBook}
        disabled={loading}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow transition-all"
      >
        {loading ? "Booking..." : "Book Session"}
      </button>
    </div>
  );
}


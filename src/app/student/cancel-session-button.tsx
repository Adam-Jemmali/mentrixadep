"use client";

import { useState } from "react";
import { cancelSession } from "@/app/actions/student";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";

interface CancelSessionButtonProps {
  sessionId: string;
  startTime: string;
}

export function CancelSessionButton({ sessionId, startTime }: CancelSessionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  const sessionStart = new Date(startTime);
  const now = new Date();
  const minutesUntilStart = (sessionStart.getTime() - now.getTime()) / (1000 * 60);
  const canCancel = minutesUntilStart > 60;

  async function handleCancel() {
    if (!canCancel) {
      setError("Cannot cancel session less than 60 minutes before start time");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await cancelSession(sessionId, viewingAsUserId ?? undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel session");
      setLoading(false);
    }
  }

  if (!canCancel) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Cannot cancel
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium max-w-[150px] text-right">{error}</p>
      )}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-400 disabled:to-red-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all"
      >
        {loading ? "Cancelling..." : "Cancel"}
      </button>
    </div>
  );
}


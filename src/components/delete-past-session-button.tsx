"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePastSession } from "@/features/booking/sessions";
import { useAdminViewContext } from "@/components/admin-view-context";

interface DeletePastSessionButtonProps {
  sessionId: string;
  endTime: string;
  /**
   * When true, show Remove even if scheduled end_time is still in the future
   * (e.g. tutor marked complete or session was cancelled).
   */
  allowRemoveBeforeScheduledEnd?: boolean;
  /** Compact text for tables */
  className?: string;
}

export function DeletePastSessionButton({
  sessionId,
  endTime,
  allowRemoveBeforeScheduledEnd = false,
  className = "",
}: DeletePastSessionButtonProps) {
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionEnded = new Date(endTime) <= new Date();
  if (!sessionEnded && !allowRemoveBeforeScheduledEnd) {
    return null;
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Remove this session from your history? This only hides it for you and does not delete tutor records or payouts.",
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await deletePastSession(
      sessionId,
      viewingAsUserId ?? undefined,
    );
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {error && (
        <span className="text-[10px] text-red-600 max-w-[140px] text-right leading-tight">
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleDelete()}
        className={`text-xs font-medium text-slate-700 hover:text-red-700 underline underline-offset-2 disabled:opacity-50 ${className}`}
      >
        {loading ? "Removing…" : "Remove"}
      </button>
    </div>
  );
}

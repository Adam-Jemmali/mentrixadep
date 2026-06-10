"use client";

import { useState } from "react";
import { studentCancelSession } from "@/features/booking/cancellation";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import { isStudentCancelRefundEligible } from "@/features/booking/refund-eligibility";

interface CancelSessionButtonProps {
  sessionId: string;
  startTime: string;
}

export function CancelSessionButton({ sessionId, startTime }: CancelSessionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  const sessionStart = new Date(startTime);
  const now = new Date();
  const minutesUntilStart = (sessionStart.getTime() - now.getTime()) / (1000 * 60);
  const canCancel = minutesUntilStart > 24 * 60;
  const willBeRefunded = isStudentCancelRefundEligible(startTime);

  async function handleCancel() {
    if (!canCancel) {
      setError("Cannot cancel session less than 24 hours before start time");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await studentCancelSession(sessionId, viewingAsUserId ?? undefined);
      if (result.success) {
        const refundMsg = result.refunded ? ` You'll receive a refund of $${(result.refundCents || 0) / 100}.` : "";
        setSuccessMessage(`Session cancelled.${refundMsg}`);
        setTimeout(() => router.refresh(), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel session");
      setLoading(false);
    }
  }

  if (!canCancel) {
    return (
      <span
        className="text-xs text-slate-500 max-w-[200px] text-right"
        title="Sessions can only be cancelled more than 24 hours before the scheduled start."
      >
        Cancel unavailable (24h policy)
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium max-w-[150px] text-right">{error}</p>
      )}
      {successMessage && (
        <p className="text-xs text-green-600 dark:text-green-400 font-medium max-w-[150px] text-right">{successMessage}</p>
      )}
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-400 disabled:to-red-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all"
        >
          {loading ? "Cancelling..." : "Cancel"}
        </button>
        {willBeRefunded && (
          <span className="text-xs text-slate-500">
            (100% refund eligible)
          </span>
        )}
      </div>
    </div>
  );
}


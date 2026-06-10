"use client";

import { approveRegistrationRequest, rejectRegistrationRequest } from "@/features/admin/registration-queue";


import { useState } from "react";

import { useRouter } from "next/navigation";

export function RegistrationActions({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      await approveRegistrationRequest(requestId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    setError(null);
    try {
      await rejectRegistrationRequest(requestId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-red-800 dark:text-red-200 text-xs font-medium">{error}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all"
        >
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading !== null}
          className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-400 disabled:to-red-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all"
        >
          {loading === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  );
}


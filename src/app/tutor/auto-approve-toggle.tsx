"use client";

import { useState } from "react";
import { toggleAutoApprove } from "@/app/actions/tutor";
import { useRouter } from "next/navigation";

interface AutoApproveToggleProps {
  initialValue: boolean;
}

export function AutoApproveToggle({ initialValue }: AutoApproveToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleToggle() {
    const newValue = !enabled;
    setLoading(true);
    setError(null);

    try {
      await toggleAutoApprove(newValue);
      setEnabled(newValue);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update setting");
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Auto-Approve Session Requests</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Automatically approve session requests when enabled
          </p>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">{error}</p>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
            enabled ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gray-300 dark:bg-gray-600"
          } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}


"use client";

import { useState, useTransition } from "react";
import { toggleAutoApprove } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";

interface AutoApproveToggleProps {
  initialValue: boolean;
}

export function AutoApproveToggle({ initialValue }: AutoApproveToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  async function handleToggle() {
    const newValue = !enabled;
    const previousValue = enabled;
    setEnabled(newValue);
    setLoading(true);
    setError(null);

    try {
      await toggleAutoApprove(newValue, viewingAsUserId ?? undefined);
      startTransition(() => router.refresh());
    } catch (err) {
      setEnabled(previousValue);
      setError(err instanceof Error ? err.message : "Failed to update setting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <label
        htmlFor="auto-approve"
        className={`relative inline-block w-10 h-5 rounded-full transition-colors ${
          enabled ? "bg-[#2563EB]" : "bg-[#E2E8F0]"
        } ${loading || isRefreshing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={(e) => {
          e.preventDefault();
          if (!loading && !isRefreshing) {
            handleToggle();
          }
        }}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </label>
      <input
        id="auto-approve"
        type="checkbox"
        checked={enabled}
        readOnly
        className="hidden"
      />
      {error && (
        <p className="mt-1 text-[11px] text-red-600">
          {error}
        </p>
      )}
    </>
  );
}


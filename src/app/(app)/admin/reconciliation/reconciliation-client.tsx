"use client";

import { useEffect, useState } from "react";
import {
  getReconciliationData,
  type PipelineHealth,
} from "@/app/actions/reconciliation";
import { cn } from "@/lib/utils";

function MetricCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status?: "ok" | "warning" | "error";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        status === "error"
          ? "border-red-200 bg-red-50"
          : status === "warning"
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-white"
      )}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export function ReconciliationClient() {
  const [data, setData] = useState<PipelineHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    getReconciliationData(days)
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">Could not load reconciliation data.</p>
      </div>
    );
  }

  const completionRate =
    data.checkoutsStarted > 0
      ? Math.round((data.checkoutsCompleted / data.checkoutsStarted) * 100)
      : 100;
  const hasOrphans = data.orphanedPayments.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Pipeline Reconciliation</h1>
        <div className="flex gap-2">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                days === d
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Checkouts started" value={data.checkoutsStarted} />
        <MetricCard
          label="Checkouts completed"
          value={data.checkoutsCompleted}
          status={completionRate < 50 ? "warning" : "ok"}
        />
        <MetricCard label="Checkouts expired" value={data.checkoutsExpired} />
        <MetricCard label="Webhooks received" value={data.webhooksReceived} />
        <MetricCard label="Sessions booked" value={data.sessionsBooked} />
      </div>

      {/* Conversion funnel */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Checkout Funnel</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-slate-500">Completion Rate</p>
            <p className="text-3xl font-bold tabular-nums text-slate-900">{completionRate}%</p>
          </div>
          <div className="relative h-4 flex-[3] overflow-hidden rounded-full bg-slate-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-blue-600 transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Orphaned payments */}
      <div
        className={cn(
          "rounded-xl border p-6 shadow-sm",
          hasOrphans ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
        )}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {hasOrphans
            ? `${data.orphanedPayments.length} Orphaned Payment(s)`
            : "No Orphaned Payments"}
        </h2>
        {hasOrphans && (
          <div className="space-y-2">
            {data.orphanedPayments.map((o) => (
              <div
                key={o.checkoutSessionId}
                className="flex items-center justify-between rounded-lg bg-white p-3 text-sm"
              >
                <code className="text-xs text-slate-600">{o.checkoutSessionId}</code>
                <span className="text-xs text-slate-400">
                  {new Date(o.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

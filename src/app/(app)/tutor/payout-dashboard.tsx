"use client";

/**
 * TutorPayoutDashboard
 *
 * Shows tutor earnings and payout readiness with non-Stripe tutor payout options.
 */

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { AlertCircle, Clock, CircleDollarSign } from "lucide-react";
import type { PayoutDashboardData, PayoutLedgerRow } from "@/app/actions/tutor-payouts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "text-amber-600", dot: "bg-amber-400" },
  held: { label: "On hold", color: "text-amber-600", dot: "bg-amber-400" },
  transferred: { label: "Paid", color: "text-emerald-600", dot: "bg-emerald-400" },
  failed: { label: "Failed", color: "text-red-500", dot: "bg-red-400" },
  refunded: { label: "Refunded", color: "text-slate-500", dot: "bg-slate-300" },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  caption,
  highlight,
}: {
  label: string;
  value: string;
  caption?: string;
  highlight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-md border p-4 ${
        highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 text-xl font-medium tabular-nums ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {caption && <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{caption}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-slate-500",
    dot: "bg-slate-300",
  };

  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PayoutSetupBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">Set up your payout method to receive earnings</p>
        <p className="mt-0.5 text-xs text-amber-700">
          Student checkout stays on Stripe. Tutor payouts use your preferred method.
        </p>
        <div className="mt-3 rounded border border-amber-200 bg-white/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Quick payout checklist
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-amber-900">
            {[
              "Choose payout method: PayPal (preferred) or bank transfer",
              "Add payout details (PayPal email or bank account info)",
              "Confirm your legal name for payout verification",
              "Payouts are sent after the 7-day hold window",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-amber-700">
            Next action: send your payout details to finance to activate tutor payouts.
          </p>
        </div>
      </div>
      <a
        href="mailto:finance@mentrixa.one?subject=Tutor%20Payout%20Setup"
        className="flex shrink-0 items-center gap-1.5 rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition-all hover:bg-amber-50 active:scale-95"
      >
        Send payout details
      </a>
    </div>
  );
}

// ─── Transaction table ────────────────────────────────────────────────────────

function TransactionTable({ rows }: { rows: PayoutLedgerRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CircleDollarSign size={24} className="mb-3 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No transactions yet</p>
        <p className="mt-1 text-xs text-slate-400">Earnings from completed sessions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {["Session date", "Learner", "Course", "Gross", "Platform fee", "Net", "Status"].map((h) => (
              <th
                key={h}
                className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400 first:pl-0 last:pr-0 px-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
              <td className="py-3 pl-0 pr-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                {fmtDate(row.session_date)}
              </td>
              <td className="py-3 px-3 text-xs text-slate-700 max-w-[140px] truncate">{row.student_name ?? "—"}</td>
              <td className="py-3 px-3 text-xs text-slate-700 max-w-[160px] truncate">{row.course ?? "—"}</td>
              <td className="py-3 px-3 text-xs tabular-nums text-slate-700">{usd(row.gross_cents)}</td>
              <td className="py-3 px-3 text-xs tabular-nums text-slate-500">−{usd(row.platform_fee_cents)}</td>
              <td className="py-3 px-3 text-xs tabular-nums font-medium text-slate-900">{usd(row.net_cents)}</td>
              <td className="py-3 pl-3 pr-0">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TutorPayoutDashboardProps {
  data: PayoutDashboardData;
}

export function TutorPayoutDashboard({ data }: TutorPayoutDashboardProps) {
  const { pendingCents, heldCents, availableCents, lifetimeEarnedCents, ledger } = data;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-900">Payouts</h2>
          <p className="mt-0.5 text-xs text-slate-500">Your earnings split · 85% to you, 15% platform fee</p>
        </div>
      </div>

      <PayoutSetupBanner />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Available to withdraw"
          value={usd(availableCents)}
          caption="Ready for your selected payout method"
          highlight={availableCents > 0}
        />
        <MetricCard label="Pending hold" value={usd(heldCents)} caption="7-day hold after session" />
        <MetricCard label="Awaiting transfer" value={usd(pendingCents)} caption="Hold cleared, payout queued" />
        <MetricCard label="Lifetime earned" value={usd(lifetimeEarnedCents)} caption="Total net earnings" />
      </div>

      {(heldCents > 0 || pendingCents > 0) && (
        <div className="mb-4 flex items-start gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2">
          <Clock size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-[11px] leading-relaxed text-slate-500">
            Funds are held for 7 days after session completion to cover potential disputes. Payouts are queued once the
            hold clears.
          </p>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Transaction history</h3>
          <span className="text-[11px] text-slate-400">
            {ledger.length} transaction{ledger.length !== 1 ? "s" : ""}
          </span>
        </div>
        <TransactionTable rows={ledger} />
      </div>
    </section>
  );
}

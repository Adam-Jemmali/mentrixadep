"use client";

/**
 * TutorPayoutDashboard
 *
 * Shows:
 *  – Connect onboarding CTA when stripe_payouts_enabled = false
 *  – Pending (in 7-day hold) / Available / Lifetime earnings chips
 *  – "Transfer to Bank" button
 *  – Transaction history table
 */

import { useState, useTransition, useRef, useEffect } from "react";
import { gsap } from "gsap";
import {
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  ChevronRight,
  CircleDollarSign,
} from "lucide-react";
import type {
  PayoutDashboardData,
  PayoutLedgerRow,
} from "@/app/actions/stripe-connect";
import { triggerManualPayout } from "@/app/actions/stripe-connect";
import { useRouter } from "next/navigation";

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

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  pending: { label: "Pending",    color: "text-amber-600",  dot: "bg-amber-400" },
  held:    { label: "On hold",    color: "text-amber-600",  dot: "bg-amber-400" },
  transferred: { label: "Paid",   color: "text-emerald-600", dot: "bg-emerald-400" },
  failed:  { label: "Failed",     color: "text-red-500",    dot: "bg-red-400" },
  refunded:{ label: "Refunded",   color: "text-slate-500",  dot: "bg-slate-300" },
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
        highlight
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-medium tabular-nums ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {caption && (
        <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{caption}</p>
      )}
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

// ─── Onboarding banner ────────────────────────────────────────────────────────

function OnboardingBanner({
  payoutsEnabled,
  onboardingUrl,
  incomplete,
}: {
  payoutsEnabled: boolean;
  onboardingUrl: string | null;
  incomplete?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/create", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        throw new Error(json.error ?? "Failed to start setup");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Setup failed. Please try again.");
      setLoading(false);
    }
  };

  if (payoutsEnabled) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">
          {incomplete ? "Finish payment setup to receive earnings" : "Set up payments to receive earnings"}
        </p>
        <p className="mt-0.5 text-xs text-amber-700">
          Connect your bank account via Stripe to receive 85% of each session fee automatically.
        </p>
      </div>
      <button
        onClick={() => void handleSetup()}
        disabled={loading}
        className="flex shrink-0 items-center gap-1.5 rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition-all hover:bg-amber-50 active:scale-95 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <ExternalLink size={12} />
        )}
        {incomplete ? "Continue setup" : "Setup payments"}
      </button>
    </div>
  );
}

// ─── Transfer to bank CTA ─────────────────────────────────────────────────────

function TransferToBankButton({
  availableCents,
  payoutsEnabled,
}: {
  availableCents: number;
  payoutsEnabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handlePayout = () => {
    startTransition(async () => {
      try {
        const { payoutId } = await triggerManualPayout();
        setResult(`Payout initiated (${payoutId}). Funds arrive within 2 business days.`);
        router.refresh();
      } catch (e) {
        setResult(e instanceof Error ? e.message : "Payout failed. Try again.");
      }
    });
  };

  if (!payoutsEnabled) return null;

  return (
    <div>
      <button
        onClick={handlePayout}
        disabled={isPending || availableCents <= 0}
        className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
          availableCents > 0 && !isPending
            ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
            : "border-slate-200 bg-white text-slate-400 cursor-not-allowed"
        }`}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ArrowUpRight size={14} />
        )}
        Transfer to bank
        {availableCents > 0 && (
          <span className="ml-1 text-xs opacity-70">{usd(availableCents)}</span>
        )}
      </button>
      {result && (
        <p className="mt-2 text-xs text-slate-600">{result}</p>
      )}
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
        <p className="mt-1 text-xs text-slate-400">
          Earnings from completed sessions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {["Session date", "Learner", "Course", "Gross", "Platform fee", "Net", "Status"].map(
              (h) => (
                <th
                  key={h}
                  className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400 first:pl-0 last:pr-0 px-3"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-slate-50 transition-colors hover:bg-slate-50/60"
            >
              <td className="py-3 pl-0 pr-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                {fmtDate(row.session_date)}
              </td>
              <td className="py-3 px-3 text-xs text-slate-700 max-w-[140px] truncate">
                {row.student_name ?? "—"}
              </td>
              <td className="py-3 px-3 text-xs text-slate-700 max-w-[160px] truncate">
                {row.course ?? "—"}
              </td>
              <td className="py-3 px-3 text-xs tabular-nums text-slate-700">
                {usd(row.gross_cents)}
              </td>
              <td className="py-3 px-3 text-xs tabular-nums text-slate-500">
                −{usd(row.platform_fee_cents)}
              </td>
              <td className="py-3 px-3 text-xs tabular-nums font-medium text-slate-900">
                {usd(row.net_cents)}
              </td>
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
  connectParam?: string | null;
}

export function TutorPayoutDashboard({
  data,
  connectParam,
}: TutorPayoutDashboardProps) {
  const { connectStatus, pendingCents, heldCents, availableCents, lifetimeEarnedCents, ledger } =
    data;

  const [showSuccess] = useState(connectParam === "success");

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-900">Payouts</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Your earnings split · 85% to you, 15% platform fee
          </p>
        </div>
        <TransferToBankButton
          availableCents={availableCents}
          payoutsEnabled={connectStatus.payoutsEnabled}
        />
      </div>

      {/* Connect status notices */}
      {showSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
          <p className="text-xs text-emerald-800 font-medium">
            Payment account connected. You&apos;ll receive funds after sessions complete.
          </p>
        </div>
      )}

      <OnboardingBanner
        payoutsEnabled={connectStatus.payoutsEnabled}
        onboardingUrl={connectStatus.onboardingUrl}
        incomplete={connectParam === "incomplete"}
      />

      {/* Metric chips */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Available to withdraw"
          value={usd(availableCents)}
          caption="Ready in your Stripe balance"
          highlight={availableCents > 0}
        />
        <MetricCard
          label="Pending hold"
          value={usd(heldCents)}
          caption="7-day hold after session"
        />
        <MetricCard
          label="Awaiting transfer"
          value={usd(pendingCents)}
          caption="Hold cleared, transfer queued"
        />
        <MetricCard
          label="Lifetime earned"
          value={usd(lifetimeEarnedCents)}
          caption="Total net paid to your account"
        />
      </div>

      {/* Hold explanation */}
      {(heldCents > 0 || pendingCents > 0) && (
        <div className="mb-4 flex items-start gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2">
          <Clock size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Funds are held for 7 days after session completion to cover potential disputes.
            Transfers fire automatically once the hold clears.
          </p>
        </div>
      )}

      {/* Transaction history */}
      <div className="border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Transaction history
          </h3>
          <span className="text-[11px] text-slate-400">
            {ledger.length} transaction{ledger.length !== 1 ? "s" : ""}
          </span>
        </div>
        <TransactionTable rows={ledger} />
      </div>

      {/* Stripe dashboard link */}
      {connectStatus.payoutsEnabled && connectStatus.accountId && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <a
            href="https://dashboard.stripe.com/express"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ExternalLink size={11} />
            Open Stripe Express Dashboard for full payout history
            <ChevronRight size={11} className="ml-auto" />
          </a>
        </div>
      )}
    </section>
  );
}

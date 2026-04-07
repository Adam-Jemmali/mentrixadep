"use client";

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
import type { PayoutDashboardData, PayoutLedgerRow } from "@/app/actions/stripe-connect";
import { createAccountLink, triggerManualPayout } from "@/app/actions/stripe-connect";
import { useRouter } from "next/navigation";

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
  pending: { label: "Queued", color: "text-amber-600", dot: "bg-amber-400" },
  held: { label: "Queued", color: "text-amber-600", dot: "bg-amber-400" },
  transferred: { label: "Paid", color: "text-emerald-600", dot: "bg-emerald-400" },
  failed: { label: "Failed", color: "text-red-500", dot: "bg-red-400" },
  refunded: { label: "Refunded", color: "text-slate-500", dot: "bg-slate-300" },
};

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

function OnboardingBanner({
  payoutsEnabled,
  onboardingUrl,
  onboardingGuide,
  incomplete,
}: {
  payoutsEnabled: boolean;
  onboardingUrl: string | null;
  onboardingGuide: PayoutDashboardData["connectStatus"]["onboardingGuide"];
  incomplete?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleSetup = async () => {
    setSetupError(null);
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
      return;
    }
    setLoading(true);
    try {
      // Use the Server Action instead of POST /api/... — middleware CSRF can block bare fetch()
      // (403 "Invalid CSRF or origin"), which made this flow fall through to the public Stripe site.
      const { url } = await createAccountLink();
      window.location.href = url;
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : "Could not start Stripe setup. Try again.");
    } finally {
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
        <div className="mt-3 rounded border border-amber-200 bg-white/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Step-by-step checklist</p>
          <ul className="mt-2 space-y-1.5 text-xs text-amber-900">
            {onboardingGuide.steps.map((step) => (
              <li key={step.key} className="flex items-start gap-2">
                <span className={`mt-0.5 inline-block h-2 w-2 rounded-full ${step.done ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span>
                  <span className="font-medium">{step.label}</span>
                  {step.details ? <span className="text-amber-700"> - {step.details}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {!onboardingGuide.accountReady && onboardingGuide.nextAction ? (
            <p className="mt-2 text-[11px] text-amber-800">
              Next action: <span className="font-semibold">{onboardingGuide.nextAction}</span>
            </p>
          ) : null}
          {onboardingGuide.disabledReason ? (
            <p className="mt-1 text-[11px] text-amber-800">
              Stripe status: {onboardingGuide.disabledReason}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-amber-700">
            You do not need to create a company. Choose <span className="font-semibold">Individual</span> or <span className="font-semibold">Sole proprietor</span>.
          </p>
          {setupError ? (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {setupError}
            </p>
          ) : null}
        </div>
      </div>
      <button
        onClick={() => void handleSetup()}
        disabled={loading}
        className="flex shrink-0 items-center gap-1.5 rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition-all hover:bg-amber-50 active:scale-95 disabled:opacity-60"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
        {incomplete ? "Continue setup" : "Setup payments"}
      </button>
    </div>
  );
}

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
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
        Transfer to bank
        {availableCents > 0 && <span className="ml-1 text-xs opacity-70">{usd(availableCents)}</span>}
      </button>
      {result && <p className="mt-2 text-xs text-slate-600">{result}</p>}
    </div>
  );
}

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
              <td className="py-3 pl-0 pr-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">{fmtDate(row.session_date)}</td>
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

interface TutorPayoutDashboardProps {
  data: PayoutDashboardData;
  connectParam?: string | null;
}

export function TutorPayoutDashboard({ data, connectParam }: TutorPayoutDashboardProps) {
  const { connectStatus, pendingCents, queuedCents, availableCents, lifetimeEarnedCents, ledger } = data;

  const [showSuccess] = useState(connectParam === "success");
  const showError = connectParam === "error";
  const showIncomplete = connectParam === "incomplete";

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-900">Payouts</h2>
          <p className="mt-0.5 text-xs text-slate-500">Your earnings split · 85% to you, 15% platform fee</p>
        </div>
        <TransferToBankButton availableCents={availableCents} payoutsEnabled={connectStatus.payoutsEnabled} />
      </div>

      {showSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
          <p className="text-xs text-emerald-800 font-medium">
            Payment account connected. You will receive funds after sessions complete.
          </p>
        </div>
      )}

      {showIncomplete && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertCircle size={14} className="shrink-0 text-amber-600" />
          <p className="text-xs text-amber-900 font-medium">
            Stripe onboarding is not complete yet. Finish setup to receive tutor payouts.
          </p>
        </div>
      )}

      {showError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertCircle size={14} className="shrink-0 text-red-600" />
          <p className="text-xs text-red-800 font-medium">We could not confirm your Stripe setup. Please try setup again.</p>
        </div>
      )}

      <OnboardingBanner
        payoutsEnabled={connectStatus.payoutsEnabled}
        onboardingUrl={connectStatus.onboardingUrl}
        onboardingGuide={connectStatus.onboardingGuide}
        incomplete={showIncomplete}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Available to withdraw" value={usd(availableCents)} caption="Ready in your Stripe balance" highlight={availableCents > 0} />
        <MetricCard label="Queued payout" value={usd(queuedCents)} caption="Created right after session completion" />
        <MetricCard label="Awaiting transfer" value={usd(pendingCents)} caption="Waiting for Stripe to finish the transfer" />
        <MetricCard label="Lifetime earned" value={usd(lifetimeEarnedCents)} caption="Total net paid to your account" />
      </div>

      {(queuedCents > 0 || pendingCents > 0) && (
        <div className="mb-4 flex items-start gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2">
          <Clock size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Funds are transferred automatically after the session completes. If Stripe cannot finish immediately, the payout ledger keeps it queued for retry.
          </p>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Transaction history</h3>
          <span className="text-[11px] text-slate-400">{ledger.length} transaction{ledger.length !== 1 ? "s" : ""}</span>
        </div>
        <TransactionTable rows={ledger} />
      </div>

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

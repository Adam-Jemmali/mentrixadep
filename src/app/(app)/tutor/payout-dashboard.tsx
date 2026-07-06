"use client";

import { useState, useTransition, useRef } from "react";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import {
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  CircleDollarSign,
} from "lucide-react";
import type { PayoutDashboardData, PayoutLedgerRow } from "@/features/payments/payout-ledger";
import { triggerManualPayout } from "@/features/payments/payout-ledger";
import { useRouter } from "next/navigation";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { GuideStickyNote } from "@/features/tutor/ui/guide-sticky-note";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { GUIDE_PAYOUTS } from "@/features/tutor/guide-home-copy-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

function cad(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
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
  useGsapEffect((gsap) => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
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
      {caption && <p className="mt-1.5 text-[11px] leading-snug text-[#64748B]">{caption}</p>}
    </div>
  );
}

const PAYOUT_TABLE_HEADERS: { label: string; icon?: VocabIconName }[] = [
  { label: GUIDE_PAYOUTS.tableSession, icon: "session" },
  { label: GUIDE_PAYOUTS.tableLearner, icon: "profile" },
  { label: GUIDE_PAYOUTS.tableSkill, icon: "skills" },
  { label: GUIDE_PAYOUTS.tableGross },
  { label: GUIDE_PAYOUTS.tableFee },
  { label: GUIDE_PAYOUTS.tableNet },
  { label: GUIDE_PAYOUTS.tableStatus, icon: "status-pending" },
];

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
  onboardingGuide,
  incomplete,
  stripeAccountId,
}: {
  payoutsEnabled: boolean;
  onboardingGuide: PayoutDashboardData["connectStatus"]["onboardingGuide"];
  incomplete?: boolean;
  stripeAccountId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleOpenDashboard = async () => {
    setSetupError(null);
    setLoading(true);
    try {
      const { url } = await triggerManualPayout();
      window.location.href = url;
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : "Could not open Stripe.");
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <div
      className={`mb-6 flex flex-col gap-3 rounded-md px-4 py-3 sm:flex-row sm:items-start ${
        payoutsEnabled ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"
      }`}
    >
      <AlertCircle size={16} className={`mt-0.5 shrink-0 ${payoutsEnabled ? "text-emerald-600" : "text-amber-600"}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${payoutsEnabled ? "text-emerald-900" : "text-amber-900"}`}>
          {payoutsEnabled
            ? GUIDE_PAYOUTS.stripeReady
            : incomplete
              ? GUIDE_PAYOUTS.stripeFinish
              : GUIDE_PAYOUTS.stripeConnect}
        </p>
        <p className={`mt-0.5 text-xs ${payoutsEnabled ? "text-emerald-700" : "text-amber-700"}`}>
          {GUIDE_PAYOUTS.stripeCadNote}
        </p>
        <div className={`mt-3 rounded border p-3 ${payoutsEnabled ? "border-emerald-200 bg-white/80" : "border-amber-200 bg-white/70"}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${payoutsEnabled ? "text-emerald-800" : "text-amber-800"}`}>
            {payoutsEnabled ? GUIDE_PAYOUTS.connectedAccount : GUIDE_PAYOUTS.checklist}
          </p>
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
              Next: <span className="font-semibold">{onboardingGuide.nextAction}</span>
            </p>
          ) : null}
          {onboardingGuide.disabledReason ? (
            <p className="mt-1 text-[11px] text-amber-800">Stripe: {onboardingGuide.disabledReason}</p>
          ) : null}
          {stripeAccountId ? (
            <p className="mt-2 font-mono text-[10px] text-slate-500">Account: {stripeAccountId}</p>
          ) : null}
          {setupError ? (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {setupError}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        {!payoutsEnabled ? (
          <a
            href="/tutor/stripe/refresh"
            className="inline-flex items-center justify-center gap-1.5 rounded border border-[#635bff] bg-[#635bff] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#4b44c9]"
          >
            <ExternalLink size={12} />
            {GUIDE_PAYOUTS.continueStripe}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void handleOpenDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded border border-emerald-600 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
            {GUIDE_PAYOUTS.openExpress}
          </button>
        )}
      </div>
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

  const handlePayout = () => {
    startTransition(async () => {
      try {
        const { url } = await triggerManualPayout();
        window.location.href = url;
      } catch (e) {
        setResult(e instanceof Error ? e.message : "Could not open Stripe.");
      }
    });
  };

  if (!payoutsEnabled) return null;

  return (
    <div>
      <button
        type="button"
        onClick={handlePayout}
        disabled={isPending}
        className="flex items-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-60"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
        {GUIDE_PAYOUTS.balanceBtn}
        {availableCents > 0 && <span className="ml-1 text-xs opacity-80">{cad(availableCents)}</span>}
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
        <p className="text-sm font-medium text-slate-500">{GUIDE_PAYOUTS.noTransactions}</p>
        <p className="mt-1 text-xs text-slate-400">{GUIDE_PAYOUTS.noTransactionsSub}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {PAYOUT_TABLE_HEADERS.map((h) => (
              <th
                key={h.label}
                className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400 first:pl-0 last:pr-0 px-3"
              >
                <span className="inline-flex items-center gap-1.5">
                  {h.icon ? (
                    <MentrixaVocabIcon name={h.icon} size={12} className="text-slate-400" title={h.label} />
                  ) : null}
                  {h.label}
                </span>
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
              <td className="py-3 px-3 text-xs tabular-nums text-slate-700">{cad(row.gross_cents)}</td>
              <td className="py-3 px-3 text-xs tabular-nums text-slate-500">−{cad(row.platform_fee_cents)}</td>
              <td className="py-3 px-3 text-xs tabular-nums font-medium text-slate-900">{cad(row.net_cents)}</td>
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
  const showUnavailable = connectParam === "unavailable";

  return (
    <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.payouts}>
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className={`text-sm font-semibold ${mentrixStudent.textOnLight}`}>{GUIDE_PAYOUTS.title}</h2>
          <p className={`mt-0.5 text-xs ${mentrixStudent.textMutedOnLight}`}>{GUIDE_PAYOUTS.subtitle}</p>
        </div>
        <TransferToBankButton availableCents={availableCents} payoutsEnabled={connectStatus.payoutsEnabled} />
      </div>

      {showSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
          <p className="text-xs font-medium text-emerald-800">
            {GUIDE_PAYOUTS.successBanner}
          </p>
        </div>
      )}

      {showIncomplete && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertCircle size={14} className="shrink-0 text-amber-600" />
          <p className="text-xs font-medium text-amber-900">
            {GUIDE_PAYOUTS.incompleteBanner}
          </p>
        </div>
      )}

      {showError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertCircle size={14} className="shrink-0 text-red-600" />
          <p className="text-xs font-medium text-red-800">{GUIDE_PAYOUTS.errorBanner}</p>
        </div>
      )}
      {showUnavailable && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertCircle size={14} className="shrink-0 text-red-600" />
          <p className="text-xs font-medium text-red-800">
            {GUIDE_PAYOUTS.unavailableBanner}
          </p>
        </div>
      )}

      <OnboardingBanner
        payoutsEnabled={connectStatus.payoutsEnabled}
        onboardingGuide={connectStatus.onboardingGuide}
        incomplete={showIncomplete}
        stripeAccountId={connectStatus.accountId}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label={GUIDE_PAYOUTS.available}
          value={cad(availableCents)}
          caption={GUIDE_PAYOUTS.availableCaption}
          highlight={availableCents > 0}
        />
        <MetricCard label={GUIDE_PAYOUTS.queued} value={cad(queuedCents)} caption={GUIDE_PAYOUTS.queuedCaption} />
        <MetricCard label={GUIDE_PAYOUTS.awaiting} value={cad(pendingCents)} caption={GUIDE_PAYOUTS.awaitingCaption} />
        <MetricCard label={GUIDE_PAYOUTS.lifetime} value={cad(lifetimeEarnedCents)} caption={GUIDE_PAYOUTS.lifetimeCaption} />
      </div>

      {(queuedCents > 0 || pendingCents > 0) && (
        <div className="mb-4 flex items-start gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2">
          <Clock size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-[11px] leading-relaxed text-slate-500">
            {GUIDE_PAYOUTS.queuedNote}
          </p>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">{GUIDE_PAYOUTS.history}</h3>
          <span className="text-[11px] text-slate-400">
            {ledger.length} transaction{ledger.length !== 1 ? "s" : ""}
          </span>
        </div>
        <TransactionTable rows={ledger} />
      </div>
    </section>
    </GuideStickyNote>
  );
}

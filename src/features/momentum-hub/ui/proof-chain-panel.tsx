"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";
import type { ProofChainPanelData, ProofChainStep } from "@/features/momentum-hub/proof-chain-pure";
import { MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW } from "@/features/payments/momentum-membership-pure";

function stepStatusClass(status: ProofChainStep["status"]): string {
  switch (status) {
    case "complete":
      return "border-emerald-300 bg-emerald-50 text-emerald-950";
    case "current":
      return "border-violet-400 bg-violet-50 text-violet-950 ring-2 ring-violet-300";
    case "stalled":
      return "border-amber-400 bg-amber-50 text-amber-950";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
}

function ProofChainRail({ steps }: { steps: ProofChainStep[] }) {
  return (
    <ol className="mt-4 grid gap-3 sm:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.id} className="relative">
          {index < steps.length - 1 ? (
            <span
              className="absolute right-[-0.35rem] top-5 hidden h-0.5 w-3 bg-zinc-300 sm:block"
              aria-hidden
            />
          ) : null}
          <div className={cn("rounded-xl border px-3 py-3", stepStatusClass(step.status))}>
            <p className="text-xs font-medium leading-snug">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ProofChainPanel({ data }: { data: ProofChainPanelData }) {
  if (data.mode === "teaser") {
    return (
      <section
        className={cn(mentrixStudent.card, "border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-5 sm:p-6")}
        aria-label="Proof Chain teaser"
      >
        <VocabSectionHeading name="loop-report" label="Proof Chain" surface="light" />
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
          {MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW}
        </p>
        <p className="mt-3 text-sm font-semibold text-zinc-800">
          {data.stepCount} steps locked on {data.nodeName}
        </p>
        <p className="mt-2 text-sm text-zinc-600">{data.upsellLine}</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/student/subscribe">Unlock Proof Chain</Link>
        </Button>
      </section>
    );
  }

  const headline = data.primaryAction?.verdict ?? data.verdict;

  return (
    <section
      className={cn(mentrixStudent.card, "border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-5 sm:p-8")}
      aria-label="Proof Chain"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <VocabSectionHeading name="loop-report" label="Proof Chain" surface="light" />
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
            {MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW}
          </p>
        </div>
        {data.stallDays > 0 ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Stall</p>
            <p className="text-2xl font-black tabular-nums text-amber-950">{data.stallDays}d</p>
          </div>
        ) : null}
      </div>

      <ProofChainRail steps={data.steps} />

      {data.counterfactual && data.counterfactual.lift > 0 ? (
        <div className="mt-5 rounded-xl border border-[#D4A017]/40 bg-amber-50/80 px-4 py-4">
          <p className="text-2xl font-black tabular-nums text-[#D4A017]">
            {data.counterfactual.currentScore} → {data.counterfactual.projectedScore}
            <span className="ml-2 text-base text-emerald-800">+{data.counterfactual.lift}</span>
          </p>
        </div>
      ) : null}

      {data.loopVelocity ? (
        <p className="mt-4 text-sm font-medium text-indigo-900">{data.loopVelocity.verdict}</p>
      ) : null}

      <p className="mt-4 text-sm font-semibold text-zinc-900">{headline}</p>

      {data.primaryAction ? (
        <div className="mt-4">
          <Button asChild size="lg" className={mentrixStudent.hubBtnSolid}>
            <Link href={data.primaryAction.href}>{data.primaryAction.label}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <p className="w-full text-sm text-zinc-600">{data.nextAction}</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/student/loop">Loop history</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

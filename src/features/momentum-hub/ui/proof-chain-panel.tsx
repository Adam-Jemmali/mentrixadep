"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import { Lock } from "lucide-react";
import { cn } from "@/shared/core/utils";
import type { ProofChainPanelData, ProofChainStep } from "@/features/momentum-hub/proof-chain-pure";
import { MomentumValueChipsRow } from "@/features/momentum-hub/ui/momentum-value-chips";

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
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{step.label}</p>
            <p className="mt-1 text-xs font-medium leading-snug">{step.detail}</p>
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
        <div className="mt-3 flex items-center gap-3">
          <Lock className="h-5 w-5 text-violet-400" aria-hidden />
          <p className="text-sm font-semibold text-zinc-800">
            {data.stepCount} locked steps on {data.nodeName}
          </p>
        </div>
        <p className="mt-3 text-sm text-zinc-600">{data.upsellLine}</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/student/subscribe">Unlock Proof Chain</Link>
        </Button>
      </section>
    );
  }

  return (
    <section
      className={cn(mentrixStudent.card, "border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-5 sm:p-8")}
      aria-label="Proof Chain"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <VocabSectionHeading name="loop-report" label="Proof Chain" surface="light" />
          <p className="mt-1 text-xs font-medium text-violet-700">
            Unforgeable path from intervention to permanent verified movement.
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
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-900">
            Trajectory counterfactual
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums text-[#D4A017]">
            {data.counterfactual.currentScore} → {data.counterfactual.projectedScore}
            <span className="ml-2 text-base text-emerald-800">+{data.counterfactual.lift}</span>
          </p>
          <p className="mt-1 text-sm font-medium text-amber-950">{data.counterfactual.verdict}</p>
        </div>
      ) : null}

      {data.loopVelocity ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
              Loop Velocity
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-indigo-950">
              {data.loopVelocity.score}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Your median</p>
            <p className="mt-1 text-lg font-black tabular-nums text-zinc-900">
              {Math.round(data.loopVelocity.userMedianHours)}h
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cohort median</p>
            <p className="mt-1 text-lg font-black tabular-nums text-zinc-900">
              {data.loopVelocity.cohortMedianHours != null
                ? `${Math.round(data.loopVelocity.cohortMedianHours)}h`
                : "Calibrating"}
            </p>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-sm font-semibold text-zinc-900">{data.verdict}</p>
      <p className="mt-1 text-sm text-zinc-600">{data.nextAction}</p>

      {data.primaryAction ? (
        <>
          <MomentumValueChipsRow chips={data.primaryAction.chips} />
          <div className="mt-4">
            <Button asChild size="lg" className={mentrixStudent.hubBtnSolid}>
              <Link href={data.primaryAction.href}>{data.primaryAction.label}</Link>
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/student/loop">Full loop history</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

"use client";

import type { MomentumValueChips } from "@/features/momentum-hub/momentum-value-equation-pure";

export function MomentumValueChipsRow({ chips }: { chips: MomentumValueChips }) {
  return (
    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2">
        <dt className="text-[9px] font-black uppercase tracking-widest text-violet-700">Dream outcome</dt>
        <dd className="mt-0.5 text-xs font-semibold text-violet-950">{chips.dreamOutcome}</dd>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2">
        <dt className="text-[9px] font-black uppercase tracking-widest text-emerald-800">Likelihood</dt>
        <dd className="mt-0.5 text-xs font-semibold text-emerald-950">{chips.perceivedLikelihood}</dd>
      </div>
      <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2">
        <dt className="text-[9px] font-black uppercase tracking-widest text-sky-800">Time</dt>
        <dd className="mt-0.5 text-xs font-semibold text-sky-950">{chips.timeDelay}</dd>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
        <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Effort</dt>
        <dd className="mt-0.5 text-xs font-semibold text-zinc-900">{chips.effort}</dd>
      </div>
    </dl>
  );
}

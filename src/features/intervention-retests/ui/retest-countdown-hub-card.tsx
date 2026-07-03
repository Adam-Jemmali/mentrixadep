"use client";

import Link from "next/link";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { PendingRetestHubState } from "@/features/intervention-retests/retest-hub-pure";
import { buildRetestHubMessages } from "@/features/intervention-retests/retest-hub-pure";

type RetestCountdownHubCardProps = {
  state: PendingRetestHubState;
};

export function RetestCountdownHubCard({ state }: RetestCountdownHubCardProps) {
  const { verdict, nextAction, countdownLabel } = buildRetestHubMessages(state);

  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Retest countdown">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <VocabSectionHeading
            name="retest"
            label={state.isDue ? "Retest due" : state.priorityRetest ? "Priority retest" : "Retest scheduled"}
            surface="light"
          />
          <p className="mt-2 text-sm font-semibold text-zinc-900">{verdict}</p>
          <p className="mt-2 text-sm text-zinc-600">{nextAction}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Unlocks</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-violet-950">{countdownLabel}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link href="/student/quest">Take retest in Quest</Link>
        </Button>
        {!state.priorityRetest ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/student/subscribe">Upgrade to Momentum</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

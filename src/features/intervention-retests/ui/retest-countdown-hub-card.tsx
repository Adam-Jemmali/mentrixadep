"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
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
          <div className="flex items-center gap-2">
            {state.priorityRetest ? (
              <MentrixaVocabIcon name="retest" size={16} surface="light" title="Priority retest" />
            ) : (
              <Clock className="h-4 w-4 text-violet-300" aria-hidden />
            )}
            <p className={mentrixStudent.sectionEyebrowOnLight}>
              {state.isDue ? "Retest due" : state.priorityRetest ? "Priority retest" : "Retest scheduled"}
            </p>
          </div>
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

"use client";

import { Button } from "@/shared/ui/button";
import { ScrollRevealCard } from "@/shared/ui/card";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { GuideDemandSignal } from "@/features/demand-signal/demand-signal-pure";
import {
  buildDemandSignalNextAction,
  buildDemandSignalVerdict,
} from "@/features/demand-signal/demand-signal-pure";
import { GuideDemandSignalDisclosure } from "@/shared/ui/disclosure-patterns";

export function GuideDemandSignalCard({
  signals,
  onOpenAvailability,
}: {
  signals: GuideDemandSignal[];
  onOpenAvailability?: (subject: string) => void;
}) {
  if (signals.length === 0) return null;

  const verdictLine = buildDemandSignalVerdict(signals);
  const nextActionLine = buildDemandSignalNextAction(signals);

  return (
    <section className="mb-8">
      <ScrollRevealCard className={mentrixStudent.card + " p-5"}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
          Where you are needed
        </p>
        <h2 className={`mt-1 text-sm font-bold ${mentrixStudent.textOnLight}`}>
          Guide demand signal
        </h2>
        <div className="mt-3">
          <GuideDemandSignalDisclosure />
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {signals.map((signal) => (
            <li key={signal.skillNodeId} className="py-3">
              <p className="text-sm text-slate-800">{signal.rowLine}</p>
              {!signal.hasOpenAvailability ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-slate-600">
                    You have no open availability for {signal.subject}.
                  </p>
                  {onOpenAvailability ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => onOpenAvailability(signal.subject)}
                    >
                      Open a slot
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-medium text-slate-900">{verdictLine}</p>
        <p className="mt-1 text-xs text-slate-600">{nextActionLine}</p>
      </ScrollRevealCard>
    </section>
  );
}

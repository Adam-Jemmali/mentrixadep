"use client";

import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { GuideDemandSignal } from "@/features/demand-signal/demand-signal-pure";
import {
  buildDemandSignalNextAction,
  buildDemandSignalVerdict,
} from "@/features/demand-signal/demand-signal-pure";
import { GuideDemandSignalDisclosure } from "@/shared/ui/disclosure-patterns";
import { GUIDE_DEMAND, GUIDE_DEMAND_EMPTY_VERDICT } from "@/features/tutor/guide-home-copy-pure";
import { GuideStickyNote } from "@/features/tutor/ui/guide-sticky-note";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";

export function GuideDemandSignalCard({
  signals,
  onOpenAvailability,
}: {
  signals: GuideDemandSignal[];
  onOpenAvailability?: (subject: string) => void;
}) {
  const verdictLine =
    signals.length > 0 ? buildDemandSignalVerdict(signals) : GUIDE_DEMAND_EMPTY_VERDICT;
  const nextActionLine = buildDemandSignalNextAction(signals);

  return (
    <section className="mb-8">
      <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.home}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
          {GUIDE_DEMAND.eyebrow}
        </p>
        <h2 className={`mt-1 text-sm font-bold ${mentrixStudent.textOnLight}`}>
          {GUIDE_DEMAND.title}
        </h2>
        <div className="mt-3">
          <GuideDemandSignalDisclosure />
        </div>
        {signals.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {signals.map((signal) => (
              <li key={signal.skillNodeId} className="py-3">
                <p className={`text-sm ${mentrixStudent.textOnLight}`}>{signal.rowLine}</p>
                {!signal.hasOpenAvailability ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className={`text-xs ${mentrixStudent.textMutedOnLight}`}>
                      {GUIDE_DEMAND.noSlots}
                    </p>
                    {onOpenAvailability ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => onOpenAvailability(signal.subject)}
                      >
                        {GUIDE_DEMAND.addSlot}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-4 text-sm ${mentrixStudent.textMutedOnLight}`}>{verdictLine}</p>
        )}
        {signals.length > 0 ? (
          <>
            <p className={`mt-4 text-sm font-medium ${mentrixStudent.textOnLight}`}>{verdictLine}</p>
            <p className={`mt-1 text-xs ${mentrixStudent.textMutedOnLight}`}>{nextActionLine}</p>
          </>
        ) : (
          <p className={`mt-2 text-xs ${mentrixStudent.textMutedOnLight}`}>{nextActionLine}</p>
        )}
      </GuideStickyNote>
    </section>
  );
}

"use client";

import { Button } from "@/shared/ui/button";
import type { GuideDemandSignal } from "@/features/demand-signal/demand-signal-pure";
import { GUIDE_DEMAND, GUIDE_DEMAND_EMPTY_VERDICT } from "@/features/tutor/guide-home-copy-pure";
import { GuideStickyNote } from "@/features/tutor/ui/guide-sticky-note";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { cn } from "@/shared/core/utils";

export function GuideDemandSignalCard({
  signals,
  onOpenAvailability,
}: {
  signals: GuideDemandSignal[];
  onOpenAvailability?: (subject: string) => void;
}) {
  return (
    <section className="mb-8">
      <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.home}>
        <h2 className="text-sm font-bold text-[#0B1220]">{GUIDE_DEMAND.title}</h2>

        {signals.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {signals.map((signal) => (
              <li
                key={signal.skillNodeId}
                className="rounded-xl border border-[#C4B5FD] bg-white px-3 py-2.5"
              >
                <p className="text-sm font-semibold leading-snug text-[#0B1220]">
                  <span className="font-bold text-[#7C3AED]">{signal.nodeName}</span>
                  {" weak for "}
                  <span className="font-bold tabular-nums text-[#0B1220]">
                    {signal.weakStudentCount}
                  </span>
                  {signal.weakStudentCount === 1 ? " student" : " students"}
                </p>
                {!signal.hasOpenAvailability && onOpenAvailability ? (
                  <Button
                    type="button"
                    size="sm"
                    className={cn(
                      "mt-2 h-7 rounded-md bg-[#7C3AED] px-3 text-[11px] font-bold text-white hover:bg-[#6D28D9]",
                    )}
                    onClick={() => onOpenAvailability(signal.subject)}
                  >
                    {GUIDE_DEMAND.addSlot}
                  </Button>
                ) : null}
                {!signal.hasOpenAvailability && !onOpenAvailability ? (
                  <p className="mt-1.5 text-xs font-medium text-[#475569]">
                    {GUIDE_DEMAND.noSlots}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm font-medium text-[#475569]">
            {GUIDE_DEMAND_EMPTY_VERDICT}
          </p>
        )}
      </GuideStickyNote>
    </section>
  );
}

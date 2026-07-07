"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import type { ActionQueueItem } from "@/features/momentum-hub/momentum-action-queue-pure";

type MomentumActionQueuePanelProps = {
  items: ActionQueueItem[];
  upsellLine: string | null;
  momentumActive: boolean;
};

export function MomentumActionQueuePanel({
  items,
  upsellLine,
  momentumActive,
}: MomentumActionQueuePanelProps) {
  if (items.length === 0) return null;

  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Momentum action queue">
      <VocabSectionHeading name="quest" label="Action queue" surface="light" />

      <ol className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li
            key={`${item.kind}-${index}`}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">{item.headline}</p>
                <p className="mt-1 text-sm text-zinc-600">{item.evidence}</p>
                {item.hoursSaved != null && momentumActive ? (
                  <p className="mt-1 text-xs font-semibold text-violet-700">
                    {item.hoursSaved}h saved vs Breakthrough on this loop.
                  </p>
                ) : null}
              </div>
              {item.countdownLabel ? (
                <div className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                    {item.kind === "retest_due" ? "Due" : "Unlocks"}
                  </p>
                  <p className="mt-0.5 text-lg font-black tabular-nums text-violet-950">
                    {item.countdownLabel}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-3">
              <Button asChild size="sm" variant={index === 0 ? "default" : "outline"}>
                <Link href={item.ctaHref}>{item.ctaLabel}</Link>
              </Button>
            </div>
          </li>
        ))}
      </ol>

      {upsellLine ? (
        <p className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">
          {upsellLine}{" "}
          <Link href="/student/subscribe" className="font-semibold underline">
            View Momentum membership plan
          </Link>
        </p>
      ) : null}
    </section>
  );
}

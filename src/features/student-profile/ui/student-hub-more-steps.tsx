"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import type { ActionQueueItem } from "@/features/momentum-hub/momentum-action-queue-pure";

export function StudentHubMoreSteps({ items }: { items: ActionQueueItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5" aria-label="Also on deck">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Also</p>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${item.kind}-${index}`} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-800">{item.headline}</span>
            <Button asChild size="sm" variant="outline">
              <Link href={item.ctaHref}>{item.ctaLabel}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

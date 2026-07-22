"use client";

import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { GuideMemoryData } from "@/features/guide-memory/guide-memory-pure";

type GuideMemoryPanelProps = {
  data: GuideMemoryData;
  compact?: boolean;
};

export function GuideMemoryPanel({ data, compact = false }: GuideMemoryPanelProps) {
  return (
    <section
      className={`${compact ? "rounded-lg border border-indigo-100 bg-indigo-50/40 p-3" : `${mentrixStudent.card} p-5 sm:p-6`}`}
      aria-label="Guide memory"
    >
      <p className={compact ? "text-[10px] font-black uppercase tracking-widest text-indigo-600" : mentrixStudent.sectionEyebrowOnLight}>
        Guide memory
      </p>
      <p className="mt-1 text-xs text-zinc-500">Since your last session with {data.guideName}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{data.verdict}</p>
      <p className="mt-1 text-sm text-zinc-600">{data.nextAction}</p>

      {!compact ? (
        <ul className="mt-4 space-y-1.5 text-sm text-zinc-700">
          {data.verifiedNodesGained.length > 0 ? (
            <li className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              Verified: {data.verifiedNodesGained.slice(0, 3).join(", ")}
              {data.verifiedNodesGained.length > 3 ? ` +${data.verifiedNodesGained.length - 3} more` : ""}
            </li>
          ) : null}
          <li className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            Retests: {data.retestsPassed} passed. {data.retestsFailed} open or flat
          </li>
          {data.weakestOpenNode ? (
            <li className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              Weakest open: {data.weakestOpenNode}
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}

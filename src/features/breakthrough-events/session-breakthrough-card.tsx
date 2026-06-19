"use client";

import { Trophy } from "lucide-react";
import type { SessionBreakthroughLine } from "@/features/breakthrough-events/post-session-retest";

const MENTRIXER_GOLD = "#D4A017";

export function SessionBreakthroughCard({ lines }: { lines: SessionBreakthroughLine[] }) {
  if (lines.length === 0) return null;

  return (
    <div className="mt-8 text-left overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,#0f172a_0%,#1e1b4b_45%,#111827_100%)] p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5" style={{ color: MENTRIXER_GOLD }} aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
          Session breakthrough
        </p>
      </div>
      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={`${line.nodeName}-${line.guideName}`} className="text-sm text-slate-100">
            <span className="font-semibold text-amber-100">{line.nodeName}</span>
            {`: incorrect before session, correct after, with `}
            <span className="font-semibold text-cyan-200">{line.guideName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { GuideRankBadge } from "@/features/guide-rank/components/guide-rank-badge";
import type { GuideRankProgress } from "@/features/guide-rank/calculate-pure";

export function GuideRankProgressCard({ progress }: { progress: GuideRankProgress }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
            Guide Rank
          </p>
          <div className="mt-2">
            <GuideRankBadge rankKey={progress.current.key} size="lg" />
          </div>
        </div>
        {progress.next ? (
          <p className="max-w-md text-right text-xs text-slate-600">{progress.progressLabel}</p>
        ) : null}
      </div>
      {progress.next ? (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>
              Progress to {progress.next.label}
            </span>
            <span className="tabular-nums">{progress.progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width]"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

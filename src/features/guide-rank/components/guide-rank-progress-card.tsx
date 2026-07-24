import { GuideRankBadge } from "@/features/guide-rank/components/guide-rank-badge";
import type { GuideRankProgress } from "@/features/guide-rank/calculate-pure";
import { cn } from "@/shared/core/utils";
import { GUIDE_RANK } from "@/features/tutor/guide-home-copy-pure";
import { RANK_ICON_VERSION } from "@/features/xp/rank-icon-contrast";

export function GuideRankProgressCard({ progress }: { progress: GuideRankProgress }) {
  const isElite = progress.current.key === "elite";

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0A0A0A]/90",
              isElite && "ring-1 ring-[var(--mx-gold)]/40",
            )}
            style={{
              boxShadow: isElite
                ? `0 0 22px rgba(212, 160, 23, 0.28), 0 0 0 1px ${progress.current.color}55`
                : `0 8px 24px -10px ${progress.current.color}38`,
            }}
          >
            {isElite ? (
              <div
                className="pointer-events-none absolute inset-[10%] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(212,160,23,0.22) 0%, transparent 72%)" }}
              />
            ) : null}
            <img
              src={`${progress.current.iconSrc}?v=${RANK_ICON_VERSION}`}
              alt=""
              aria-hidden
              className="relative z-[1] h-[72%] w-[72%] object-contain"
            />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              {GUIDE_RANK.eyebrow}
            </p>
            <div className="mt-2">
              <GuideRankBadge rankKey={progress.current.key} size="lg" />
            </div>
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
              {GUIDE_RANK.progressTo(progress.next.label)}
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

import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import type { ArenaLeaderRow } from "@/features/live-board/types";
import { RankBadge } from "@/features/xp/components/rank-badge";

type Props = {
  leaders: ArenaLeaderRow[];
};

export function ArenaLeadersPanel({ leaders }: Props) {
  return (
    <section className="mt-12 border-t border-white/10 pt-10">
      <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
        {ARENA_PAGE_COPY.leadersTitle}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        {ARENA_PAGE_COPY.leadersSubtitle}
      </p>

      {leaders.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Leaderboard fills once five verified skills are locked across the cohort.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {leaders.map((leader, index) => (
            <li
              key={leader.userId}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0F172A]/60 px-4 py-3"
            >
              <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-slate-500">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {leader.displayName}
                </p>
                <p className="text-xs text-slate-500">
                  {leader.verifiedCount} verified skills
                </p>
              </div>
              <RankBadge
                rank={{ level: leader.rankLevel, title: leader.rankTier }}
                size="sm"
                surface="onDark"
                showLabel
                labelTone="dark"
              />
              <p className="shrink-0 text-right text-sm font-bold tabular-nums text-[#D4A017]">
                {leader.accuracyPercent}%
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

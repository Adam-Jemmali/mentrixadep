import Link from "next/link";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import type { ArenaLeaderRow } from "@/features/live-board/types";
import { ArenaPersonAvatar } from "@/features/live-board/ui/arena-person-avatar";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { explainFirstAttemptAccuracy } from "@/features/xp/rank-statistics-pure";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";

type Props = {
  leaders: ArenaLeaderRow[];
};

function ArenaLeaderCard({ leader, position }: { leader: ArenaLeaderRow; position: number }) {
  const passportHref = leader.username ? `/rank/${leader.username}` : null;

  const card = (
    <article
      className={cn(
        mentrixStudent.hubSticky,
        "rotate-0 overflow-hidden p-0 transition hover:shadow-xl",
      )}
    >
      <div className="relative border-b border-[#E0E7FF] bg-gradient-to-r from-[#EEF2FF] to-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-4">
          <ArenaPersonAvatar
            displayName={leader.displayName}
            avatarUrl={leader.avatarUrl}
            size="xl"
            rankLevel={leader.rankLevel}
            live={position === 1}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6366F1]">
              #{position} · Verified passport
            </p>
            <p className="mt-1 truncate text-lg font-bold text-[#0B1220]">{leader.displayName}</p>
            {leader.username ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6366F1]">
                @{leader.username}
              </p>
            ) : null}
          </div>
          <div className="hidden shrink-0 sm:block">
            <RankBadge
              rank={{ level: leader.rankLevel, title: leader.rankTier }}
              size="sm"
              active
              surface="light"
              showLabel
              labelTone="light"
            />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto]">
        <div className="space-y-1 border-b border-[#E0E7FF] p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
            First attempts
          </p>
          <p className="text-xs leading-relaxed text-[#475569]">
            {explainFirstAttemptAccuracy(leader.verifiedCount, leader.accuracyPercent)}
          </p>
          <p
            className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: VERIFIED_GOLD }}
          >
            {leader.rankTier} tier
          </p>
        </div>

        <div className="p-4 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
            Peer standing
          </p>
          <p
            className="mt-1 font-serif text-4xl font-bold tabular-nums"
            style={{ color: VERIFIED_GOLD }}
          >
            Top {leader.topPercent}%
          </p>
          <p className="mt-1 text-[10px] font-semibold text-[#475569]">
            {leader.verifiedCount} verified skills
          </p>
        </div>
      </div>
    </article>
  );

  if (!passportHref) return card;

  return (
    <Link
      href={passportHref}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
    >
      {card}
    </Link>
  );
}

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
        <ol className="mt-6 space-y-4">
          {leaders.map((leader, index) => (
            <li key={leader.userId}>
              <ArenaLeaderCard leader={leader} position={index + 1} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

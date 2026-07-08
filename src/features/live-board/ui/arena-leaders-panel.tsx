import Link from "next/link";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import {
  arenaLeaderAvatarInitial,
  type ArenaLeaderProfile,
} from "@/features/live-board/load-arena-leader-profile";
import { ArenaPersonAvatar } from "@/features/live-board/ui/arena-person-avatar";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { getAccountRankByLevel } from "@/features/xp/rank-icons";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";

type Props = {
  leaders: ArenaLeaderProfile[];
};

function ArenaLeaderCard({ leader, position }: { leader: ArenaLeaderProfile; position: number }) {
  const passportHref = leader.username ? `/rank/${leader.username}` : null;
  const rankVisual = getAccountRankByLevel(leader.accountRankLevel);
  const avatarInitial = arenaLeaderAvatarInitial(leader);

  const card = (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220]/90",
        "shadow-[0_0_0_1px_rgba(124,58,237,0.12),0_20px_50px_rgba(0,0,0,0.45)]",
      )}
    >
      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#7C3AED]/15 to-transparent"
          aria-hidden
        />

        <div className="relative flex items-start gap-4">
          <ArenaPersonAvatar
            displayName={leader.displayName}
            avatarUrl={leader.avatarUrl}
            avatarInitial={avatarInitial}
            size="xl"
            rankLevel={leader.accountRankLevel}
            live={position === 1}
          />

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6366F1]">
              #{position} on the live board
            </p>
            <p className="mt-1 truncate text-xl font-bold text-white">{leader.displayName}</p>
            {leader.username ? (
              <p className="text-[11px] font-semibold text-slate-400">@{leader.username}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <RankBadge
                rank={{ level: leader.accountRankLevel, title: leader.accountRankTier }}
                size="sm"
                active
                surface="onDark"
                showLabel
                labelTone="dark"
              />
              <p
                className="text-xs font-bold uppercase tracking-[0.12em]"
                style={{ color: rankVisual.labelOnDark }}
              >
                {leader.accountRankTier}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Verified standing
            </p>
            <p
              className="mt-1 font-serif text-3xl font-bold tabular-nums sm:text-4xl"
              style={{ color: VERIFIED_GOLD }}
            >
              Top {leader.topPercent}%
            </p>
          </div>
        </div>

        <div className="relative mt-4 space-y-2 border-t border-white/10 pt-4">
          <p className="text-sm leading-relaxed text-slate-300">{leader.accuracyLine}</p>
          <p className="text-sm leading-relaxed text-slate-400">{leader.peerStandingLine}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {leader.verifiedCount} verified skills locked
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
    <section className="mt-10">
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

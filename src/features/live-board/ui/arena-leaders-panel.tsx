import Link from "next/link";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import {
  arenaLeaderAvatarInitial,
  type ArenaLeaderProfile,
} from "@/features/live-board/load-arena-leader-profile";
import { ArenaPersonAvatar } from "@/features/live-board/ui/arena-person-avatar";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";

type Props = {
  leaders: ArenaLeaderProfile[];
};

function ArenaLeaderCard({ leader, position }: { leader: ArenaLeaderProfile; position: number }) {
  const passportHref = leader.username ? `/rank/${leader.username}` : null;
  const rankVisual = getAccountRankByLevel(leader.accountRankLevel);
  const isTopTier = rankVisual.key === "mentrixer";

  const card = (
    <article className={cn(mentrixStudent.hubSticky, "rotate-0 overflow-hidden p-0")}>
      <div className="grid sm:grid-cols-[minmax(0,7.5rem)_1fr]">
        <aside className="border-b border-[#E0E7FF] p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6366F1]">
            #{position}
          </p>
          <div className="mx-auto mt-3 flex max-w-[120px] flex-col items-center text-center">
            <ArenaPersonAvatar
              displayName={leader.displayName}
              avatarUrl={leader.avatarUrl}
              avatarInitial={arenaLeaderAvatarInitial(leader)}
              size="lg"
            />
            <div className="mt-3">
              <RankBadge
                rank={{ level: leader.accountRankLevel, title: leader.accountRankTier }}
                size="sm"
                active
                surface="light"
                showLabel
                labelTone="light"
              />
            </div>
            <p
              className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: isTopTier ? VERIFIED_GOLD : rankVisual.labelOnLight }}
            >
              {normalizeRankTitle(leader.accountRankTier)}
            </p>
          </div>
        </aside>

        <div className="space-y-3 p-4 sm:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Mentrixer
            </p>
            <p className="mt-1 text-lg font-bold text-[#0B1220]">{leader.displayName}</p>
            {leader.username ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6366F1]">
                @{leader.username}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              First-attempt accuracy
            </p>
            <p className={cn(mentrixHubSurfaces.inkMuted, "mt-1 text-sm leading-relaxed")}>
              {leader.accuracyLine}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Peer standing
            </p>
            <p
              className="mt-1 font-serif text-3xl font-bold tabular-nums"
              style={{ color: VERIFIED_GOLD }}
            >
              Top {leader.topPercent}%
            </p>
            <p className={cn(mentrixHubSurfaces.inkMuted, "mt-1 text-sm leading-relaxed")}>
              {leader.peerStandingLine}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
              {leader.verifiedCount} verified skills
            </p>
          </div>
        </div>
      </div>
    </article>
  );

  if (!passportHref) return card;

  return (
    <Link
      href={passportHref}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
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

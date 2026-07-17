import Image from "next/image";
import Link from "next/link";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import {
  arenaLeaderAvatarInitial,
  type ArenaLeaderProfile,
} from "@/features/live-board/load-arena-leader-profile";
import { ArenaPersonAvatar } from "@/features/live-board/ui/arena-person-avatar";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";
const ICON_VERSION = "1";

type Props = {
  leaders: ArenaLeaderProfile[];
};

function ArenaLeaderCard({ leader, position }: { leader: ArenaLeaderProfile; position: number }) {
  const passportHref = leader.username ? `/rank/${leader.username}` : null;
  const rankVisual = getAccountRankByLevel(leader.accountRankLevel);
  const isTopTier = rankVisual.key === "mentrixer";
  const rankTitle = normalizeRankTitle(leader.accountRankTier);

  const card = (
    <article
      className={cn(
        mentrixStudent.hubSticky,
        "rotate-0 overflow-hidden px-3 py-3 sm:px-4 sm:py-3.5",
      )}
    >
      <div className="flex items-center gap-3">
        <p className="w-7 shrink-0 text-center text-xs font-bold tabular-nums text-[#6366F1]">
          #{position}
        </p>

        <ArenaPersonAvatar
          displayName={leader.displayName}
          avatarUrl={leader.avatarUrl}
          avatarInitial={arenaLeaderAvatarInitial(leader)}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {isTopTier ? (
              <Image
                src={`/icons/mentrixer.svg?v=${ICON_VERSION}`}
                alt=""
                width={16}
                height={16}
                className="shrink-0"
              />
            ) : (
              <MentrixaVocabIcon name="profile" size={14} surface="light" title="Mentrixer" />
            )}
            <p className="truncate text-sm font-bold text-[#0B1220]">{leader.displayName}</p>
            {leader.username ? (
              <p className="truncate text-[11px] font-semibold text-[#6366F1]">@{leader.username}</p>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <RankBadge
                rank={{ level: leader.accountRankLevel, title: leader.accountRankTier }}
                size="sm"
                active
                surface="light"
                showLabel={false}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: isTopTier ? VERIFIED_GOLD : rankVisual.labelOnLight }}
              >
                {rankTitle}
              </span>
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-[#0B1220]">
              <MentrixaVocabIcon name="verified" size={14} gold surface="light" title="Accuracy" />
              {Math.round(leader.accuracyPercent)}%
            </span>

            <span
              className="inline-flex items-center gap-1 text-xs font-bold tabular-nums"
              style={{ color: VERIFIED_GOLD }}
            >
              <MentrixaVocabIcon name="rank-proof" size={14} gold surface="light" title="Top percent" />
              Top {leader.topPercent}%
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-[#64748B]">
              <MentrixaVocabIcon name="practice-pack" size={14} surface="light" title="Verified skills" />
              {leader.verifiedCount}
            </span>
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
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <MentrixaVocabIcon name="leaderboard" size={18} surface="dark" title="Top 10" />
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
          {ARENA_PAGE_COPY.leadersTitle}
        </h2>
      </div>
      <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{ARENA_PAGE_COPY.leadersSubtitle}</p>

      {leaders.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Leaderboard fills once five verified skills are locked across the cohort.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
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

"use client";

import Link from "next/link";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import {
  arenaLeaderAvatarInitial,
  type ArenaLeaderProfile,
} from "@/features/live-board/load-arena-leader-profile";
import { ArenaPersonAvatar } from "@/features/live-board/ui/arena-person-avatar";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

const HIGH_SKILL_ACCURACY = 75;

type Props = {
  leaders: ArenaLeaderProfile[];
};

export function ArenaLeadersPanel({ leaders }: Props) {
  const topFive = leaders.slice(0, 5);

  return (
    <section className="mt-8 pb-4">
      <LandingStickyNote variant="clip" className="overflow-hidden p-0">
        <div className="border-b border-violet-200 bg-violet-100/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <MentrixaVocabIcon name="leaderboard" size={18} surface="light" title="Top 5" />
            <h2 className="text-base font-bold text-[var(--mx-navy)] sm:text-lg">{ARENA_PAGE_COPY.leadersTitle}</h2>
          </div>
          <p className="mt-1 text-sm text-[#475569]">{ARENA_PAGE_COPY.leadersSubtitle}</p>
        </div>

        {topFive.length === 0 ? (
          <p className="bg-[var(--mx-navy)] px-4 py-8 text-center text-sm text-[var(--mx-muted)]">
            {ARENA_PAGE_COPY.leadersEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto bg-[var(--mx-navy)]">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--mx-rule)]/20 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mx-muted)]">
                  <th className="px-3 py-2.5">Rank</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Accuracy</th>
                  <th className="px-3 py-2.5">Skills</th>
                </tr>
              </thead>
              <tbody>
                {topFive.map((leader, index) => {
                  const rank = index + 1;
                  const passportHref = leader.username ? `/rank/${leader.username}` : null;
                  const goldSkills = leader.accuracyPercent >= HIGH_SKILL_ACCURACY;
                  const rowBg =
                    rank === 1
                      ? "bg-[rgba(124,58,237,0.14)]"
                      : index % 2 === 0
                        ? "bg-[var(--mx-navy)]"
                        : "bg-[var(--mx-navy-2)]";

                  return (
                    <tr
                      key={leader.userId}
                      className={cn("border-b border-[var(--mx-rule)]/15", rowBg)}
                    >
                      <td className="px-3 py-3 font-bold tabular-nums text-[var(--mx-indigo)]">
                        #{rank}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <ArenaPersonAvatar
                            displayName={leader.displayName}
                            avatarUrl={leader.avatarUrl}
                            avatarInitial={arenaLeaderAvatarInitial(leader)}
                            size="sm"
                          />
                          {passportHref ? (
                            <Link
                              href={passportHref}
                              className="truncate font-semibold text-white transition-colors hover:text-[var(--mx-violet)]"
                            >
                              {leader.displayName}
                            </Link>
                          ) : (
                            <span className="truncate font-semibold text-white">{leader.displayName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-bold tabular-nums",
                            rank === 1 ? "text-[var(--mx-indigo)]" : "text-white",
                          )}
                        >
                          <MentrixaVocabIcon
                            name="verified"
                            size={14}
                            gold={false}
                            surface="dark"
                            title="Accuracy"
                          />
                          {Math.round(leader.accuracyPercent)}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-bold tabular-nums",
                            goldSkills ? "text-[var(--mx-gold)]" : "text-[var(--mx-muted)]",
                          )}
                        >
                          <MentrixaVocabIcon
                            name="practice-pack"
                            size={14}
                            gold={goldSkills}
                            surface="dark"
                            title="Verified skills"
                          />
                          {leader.verifiedCount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </LandingStickyNote>
    </section>
  );
}

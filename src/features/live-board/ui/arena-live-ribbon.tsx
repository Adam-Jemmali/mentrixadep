"use client";

import Link from "next/link";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import type { ArenaLeaderRow } from "@/features/live-board/types";
import { ArenaPersonAvatar } from "@/features/live-board/ui/arena-person-avatar";
import { cn } from "@/shared/core/utils";

type Props = {
  leaders: ArenaLeaderRow[];
};

export function ArenaLiveRibbon({ leaders }: Props) {
  if (leaders.length === 0) return null;

  const featured = leaders.slice(0, 5);

  return (
    <section
      aria-label="Mentrixers currently leading the arena"
      className="relative mt-10 overflow-hidden rounded-2xl border border-[#7C3AED]/35 bg-gradient-to-br from-[#1E1B4B]/90 via-[#0F172A]/95 to-[#0B1220] p-5 shadow-[0_0_40px_rgba(124,58,237,0.15)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#7C3AED]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-[#6366F1]/15 blur-2xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#22C55E]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
            </span>
            {ARENA_PAGE_COPY.liveRibbonLabel}
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {featured.length === 1
              ? `${featured[0]!.displayName} is on the board`
              : `${featured.length} Mentrixers shaping the live board`}
          </p>
        </div>

        <div className="flex items-center">
          {featured.map((leader, index) => {
            const inner = (
              <span
                className={cn(
                  "relative inline-block rounded-full ring-2 ring-[#0B1220]",
                  index > 0 && "-ml-3",
                )}
                style={{ zIndex: featured.length - index }}
              >
                <ArenaPersonAvatar
                  displayName={leader.displayName}
                  avatarUrl={leader.avatarUrl}
                  size={index === 0 ? "lg" : "md"}
                  rankLevel={leader.rankLevel}
                  live={index === 0}
                />
              </span>
            );

            if (!leader.username) return <span key={leader.userId}>{inner}</span>;

            return (
              <Link
                key={leader.userId}
                href={`/rank/${leader.username}`}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                title={leader.displayName}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

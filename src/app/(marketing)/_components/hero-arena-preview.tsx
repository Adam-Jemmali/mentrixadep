"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MxStickyNote } from "@/components/mx-sticky-note";
import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";
import { LANDING_FEED_VISIBLE_LIMIT } from "@/features/live-board/live-board-messages-pure";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { cn } from "@/shared/core/utils";

const LiveBoardFeed = dynamic(
  () =>
    import("@/features/live-board/ui/live-board-feed").then((m) => ({
      default: m.LiveBoardFeed,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2 px-1 py-2" aria-hidden>
        {Array.from({ length: LANDING_FEED_VISIBLE_LIMIT }).map((_, i) => (
          <div key={i} className="h-9 rounded-md bg-white/[0.04]" />
        ))}
      </div>
    ),
  },
);

type HeroArenaPreviewProps = {
  initialEvents: LiveBoardEventRow[];
  leaders: ArenaLeaderProfile[];
  todayCount: number;
  className?: string;
};

export function HeroArenaPreview({
  initialEvents,
  leaders,
  todayCount,
  className,
}: HeroArenaPreviewProps) {
  const moreToday = Math.max(0, todayCount - LANDING_FEED_VISIBLE_LIMIT);

  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none absolute inset-0 -z-10 scale-110"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(124,58,237,0.15), transparent)",
        }}
      />

      <div className="hero-arena-card relative -rotate-1">
        <MxStickyNote color="neutral" variant="widget" className="overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                Live
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">
              First attempts only
            </span>
          </div>

          <LiveBoardFeed
            variant="hero"
            initialEvents={initialEvents}
            leaders={leaders}
            limit={LANDING_FEED_VISIBLE_LIMIT}
          />

          {moreToday > 0 ? (
            <Link
              href="/arena"
              prefetch={false}
              className="mt-3 block text-center text-[13px] font-semibold text-[var(--mx-violet)] hover:text-white"
            >
              And {moreToday} more today
            </Link>
          ) : (
            <Link
              href="/arena"
              prefetch={false}
              className="mt-3 block text-center text-[13px] font-semibold text-[var(--mx-violet)] hover:text-white"
            >
              Open the live arena
            </Link>
          )}
        </MxStickyNote>
      </div>
    </div>
  );
}

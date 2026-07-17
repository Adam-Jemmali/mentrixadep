"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/shared/integrations/supabase/client";
import {
  ARENA_PAGE_COPY,
  formatLiveBoardEventDescription,
  formatLiveBoardTimeAgo,
  isDivisionWarLiveBoardEvent,
} from "@/features/live-board/live-board-messages-pure";
import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { ArenaPersonAvatar } from "@/features/live-board/ui/arena-person-avatar";
import { normalizeArenaAvatarUrl } from "@/features/live-board/live-board-avatar-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { easeOutExpo } from "@/features/marketing/landing/v2/motion/landing-motion";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";
const FEED_LIMIT = 50;
const ROW_ENTER_MS = 0.2;

type FeedRowMotion = {
  layout?: boolean;
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
  transition: { duration: number; ease?: typeof easeOutExpo };
};

type Props = {
  initialEvents: LiveBoardEventRow[];
  leaders: ArenaLeaderProfile[];
};

const LIVE_BOARD_EVENT_TYPES = new Set<LiveBoardEventRow["event_type"]>([
  "verified_attempt",
  "rank_advance",
  "breakthrough",
  "division_war_result",
]);

function parseRealtimeRow(record: Record<string, unknown>): LiveBoardEventRow | null {
  const eventType = String(record.event_type ?? "");
  if (!LIVE_BOARD_EVENT_TYPES.has(eventType as LiveBoardEventRow["event_type"])) {
    return null;
  }

  const id = String(record.id ?? "");
  if (!id) return null;

  const rawAccuracy = record.accuracy_pct;
  const accuracyPct =
    rawAccuracy == null || rawAccuracy === ""
      ? null
      : Number(rawAccuracy);

  return {
    id,
    event_type: eventType as LiveBoardEventRow["event_type"],
    user_id: String(record.user_id ?? ""),
    display_name: String(record.display_name ?? "Mentrixer"),
    avatar_url: normalizeArenaAvatarUrl(record.avatar_url as string | null | undefined),
    skill_node_id: record.skill_node_id ? String(record.skill_node_id) : null,
    node_name: String(record.node_name ?? ""),
    unit_name: String(record.unit_name ?? ""),
    accuracy_pct: Number.isFinite(accuracyPct) ? accuracyPct : null,
    new_rank_tier: record.new_rank_tier ? String(record.new_rank_tier) : null,
    is_first_attempt: Boolean(record.is_first_attempt),
    occurred_at: String(record.occurred_at ?? new Date().toISOString()),
  };
}

function DivisionWarFeedCard({
  event,
  nowMs,
  motionProps,
}: {
  event: LiveBoardEventRow;
  nowMs: number;
  motionProps: FeedRowMotion;
}) {
  return (
    <motion.li
      layout={motionProps.layout}
      initial={motionProps.initial}
      animate={motionProps.animate}
      exit={motionProps.exit}
      transition={motionProps.transition}
      className="px-4 py-4"
    >
      <div
        className="rounded-xl border px-4 py-4 text-center shadow-sm"
        style={{
          borderColor: `${VERIFIED_GOLD}99`,
          background: "linear-gradient(90deg, #FFFBEB 0%, #F5F3FF 100%)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: VERIFIED_GOLD }}
        >
          {ARENA_PAGE_COPY.divisionWarEyebrow}
        </p>
        <p className="mt-2 text-base font-bold text-[#0B1220] sm:text-lg">
          {event.display_name}
        </p>
        {event.unit_name ? (
          <p
            className="mt-1 text-sm font-semibold tabular-nums"
            style={{ color: VERIFIED_GOLD }}
          >
            {event.unit_name}
          </p>
        ) : null}
        <time
          className="mt-2 block text-xs text-[#64748B]"
          dateTime={event.occurred_at}
        >
          {formatLiveBoardTimeAgo(event.occurred_at, nowMs)}
        </time>
      </div>
    </motion.li>
  );
}

export function LiveBoardFeed({ initialEvents, leaders }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [events, setEvents] = useState(initialEvents);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const avatarByUserId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const leader of leaders) {
      map.set(leader.userId, leader.avatarUrl);
    }
    for (const event of initialEvents) {
      if (!map.has(event.user_id) || !map.get(event.user_id)) {
        map.set(event.user_id, event.avatar_url);
      }
    }
    return map;
  }, [initialEvents, leaders]);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("live-board-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_board_events",
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = parseRealtimeRow(payload.new as Record<string, unknown>);
          if (!row) return;
          if (row.avatar_url) {
            avatarByUserId.set(row.user_id, row.avatar_url);
          }
          setEvents((current) => {
            if (current.some((event) => event.id === row.id)) return current;
            return [row, ...current].slice(0, FEED_LIMIT);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [avatarByUserId]);

  const rowMotion = useMemo(
    (): Omit<FeedRowMotion, "layout"> =>
      reducedMotion
        ? {
            initial: { opacity: 1, y: 0 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 1, y: 0 },
            transition: { duration: 0 },
          }
        : {
            initial: { opacity: 0, y: -8 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -6 },
            transition: { duration: ROW_ENTER_MS, ease: easeOutExpo },
          },
    [reducedMotion],
  );

  return (
    <section aria-label="Live verified first attempt feed" className="mt-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6366F1]">
        {ARENA_PAGE_COPY.feedEyebrow}
      </p>

      <div className={cn(mentrixStudent.hubSticky, "mt-3 rotate-0 overflow-hidden")}>
        {events.length === 0 ? (
          <p className={cn(mentrixHubSurfaces.inkMuted, "px-4 py-8 text-center text-sm")}>
            {ARENA_PAGE_COPY.emptyFeed}
          </p>
        ) : (
          <ul className="divide-y divide-[#E0E7FF]">
            <AnimatePresence initial={false}>
              {events.map((event) => {
                if (isDivisionWarLiveBoardEvent(event.event_type)) {
                  return (
                    <DivisionWarFeedCard
                      key={event.id}
                      event={event}
                      nowMs={nowMs}
                      motionProps={{ ...rowMotion, layout: !reducedMotion }}
                    />
                  );
                }

                const avatarUrl = event.avatar_url ?? avatarByUserId.get(event.user_id) ?? null;

                return (
                  <motion.li
                    key={event.id}
                    layout={!reducedMotion}
                    {...rowMotion}
                    className="flex items-start gap-3 px-4 py-3.5"
                  >
                    <ArenaPersonAvatar
                      displayName={event.display_name}
                      avatarUrl={avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn(mentrixHubSurfaces.inkBody, "text-sm leading-snug text-[#0B1220]")}>
                        {formatLiveBoardEventDescription(event)}
                      </p>
                      <p className={cn(mentrixHubSurfaces.inkMuted, "mt-1 text-xs")}>
                        {event.unit_name}
                      </p>
                    </div>
                    <time
                      className="shrink-0 pt-1 text-xs text-[#64748B]"
                      dateTime={event.occurred_at}
                    >
                      {formatLiveBoardTimeAgo(event.occurred_at, nowMs)}
                    </time>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}

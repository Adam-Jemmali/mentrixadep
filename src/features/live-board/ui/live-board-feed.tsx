"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/shared/integrations/supabase/client";
import {
  ARENA_FEED_VISIBLE_LIMIT,
  ARENA_PAGE_COPY,
  formatLiveBoardEventDescription,
  formatLiveBoardTimeAgo,
  isDivisionWarLiveBoardEvent,
  liveBoardEventVocabIcon,
} from "@/features/live-board/live-board-messages-pure";
import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { ArenaPersonAvatar } from "@/features/live-board/ui/arena-person-avatar";
import { normalizeArenaAvatarUrl } from "@/features/live-board/live-board-avatar-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { easeOutExpo } from "@/features/marketing/landing/v2/motion/landing-motion";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { isE2ESyntheticAccount } from "@/shared/core/e2e-synthetic-account-pure";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";
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
      className="px-3 py-2.5"
    >
      <div
        className="flex items-center gap-2 rounded-lg border px-3 py-2"
        style={{
          borderColor: `${VERIFIED_GOLD}99`,
          background: "linear-gradient(90deg, #FFFBEB 0%, #F5F3FF 100%)",
        }}
      >
        <MentrixaVocabIcon name="leaderboard" size={18} gold surface="light" title="Division War" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#0B1220]">{event.display_name}</p>
          {event.unit_name ? (
            <p className="truncate text-[11px] font-semibold tabular-nums" style={{ color: VERIFIED_GOLD }}>
              {event.unit_name}
            </p>
          ) : null}
        </div>
        <time className="shrink-0 text-[11px] text-[#64748B]" dateTime={event.occurred_at}>
          {formatLiveBoardTimeAgo(event.occurred_at, nowMs)}
        </time>
      </div>
    </motion.li>
  );
}

export function LiveBoardFeed({ initialEvents, leaders }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [events, setEvents] = useState(() => initialEvents.slice(0, ARENA_FEED_VISIBLE_LIMIT));
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
    setEvents(initialEvents.slice(0, ARENA_FEED_VISIBLE_LIMIT));
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
          if (
            row.event_type !== "division_war_result" &&
            isE2ESyntheticAccount({
              displayName: row.display_name,
              username: row.display_name,
            })
          ) {
            return;
          }
          if (row.avatar_url) {
            avatarByUserId.set(row.user_id, row.avatar_url);
          }
          setEvents((current) => {
            if (current.some((event) => event.id === row.id)) return current;
            return [row, ...current].slice(0, ARENA_FEED_VISIBLE_LIMIT);
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
      <div className="flex items-center gap-2">
        <MentrixaVocabIcon name="verified" size={16} gold surface="dark" title="Live feed" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6366F1]">
          {ARENA_PAGE_COPY.feedEyebrow}
        </p>
      </div>

      <div
        className={cn(
          mentrixStudent.hubSticky,
          "mt-3 max-h-[18rem] rotate-0 overflow-y-auto overscroll-contain sm:max-h-[20rem]",
        )}
      >
        {events.length === 0 ? (
          <p className={cn(mentrixHubSurfaces.inkMuted, "px-4 py-6 text-center text-sm")}>
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
                const icon = liveBoardEventVocabIcon(event.event_type);
                const goldIcon =
                  event.event_type === "verified_attempt" && event.accuracy_pct === 100;

                return (
                  <motion.li
                    key={event.id}
                    layout={!reducedMotion}
                    {...rowMotion}
                    className="flex items-center gap-2.5 px-3 py-2"
                  >
                    <ArenaPersonAvatar
                      displayName={event.display_name}
                      avatarUrl={avatarUrl}
                      size="sm"
                    />
                    <MentrixaVocabIcon
                      name={icon}
                      size={16}
                      gold={goldIcon}
                      surface="light"
                      title={event.event_type}
                    />
                    <p
                      className={cn(
                        mentrixHubSurfaces.inkBody,
                        "min-w-0 flex-1 truncate text-sm leading-snug text-[#0B1220]",
                      )}
                    >
                      {formatLiveBoardEventDescription(event)}
                    </p>
                    <time
                      className="shrink-0 text-[11px] tabular-nums text-[#64748B]"
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

"use client";

import { useEffect, useState } from "react";
import { MasteryNode, type MasteryNodeVisualState } from "@/components/mastery-node";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import {
  ARENA_BOARD_FEED_LIMIT,
  ARENA_PAGE_COPY,
  buildDivisionWarResultCardCopy,
  formatArenaBoardEventText,
  formatArenaBoardWarHeadline,
  formatDivisionWarAccuracyLine,
  formatLiveBoardTimeAgo,
  isDivisionWarLiveBoardEvent,
} from "@/features/live-board/live-board-messages-pure";
import { normalizeArenaAvatarUrl } from "@/features/live-board/live-board-avatar-pure";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { createClient } from "@/shared/integrations/supabase/client";
import { isE2ESyntheticAccount } from "@/shared/core/e2e-synthetic-account-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { AnimatePresence, motion, useReducedMotion } from "@/shared/animation/motion";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";

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
    rawAccuracy == null || rawAccuracy === "" ? null : Number(rawAccuracy);

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

function masteryStateFromEvent(event: LiveBoardEventRow): MasteryNodeVisualState {
  if (event.event_type === "breakthrough") return "proficient";
  if (event.event_type === "rank_advance") return "verified";
  if (event.event_type === "verified_attempt") {
    if (event.accuracy_pct === 100) return "verified";
    if ((event.accuracy_pct ?? 0) >= 70) return "proficient";
    return "attempted";
  }
  return "attempted";
}

function DivisionWarBoardRow({
  event,
  nowMs,
  layout,
  reducedMotion,
}: {
  event: LiveBoardEventRow;
  nowMs: number;
  layout: boolean;
  reducedMotion: boolean | null;
}) {
  const copy = buildDivisionWarResultCardCopy(event);
  const headline = formatArenaBoardWarHeadline(event);
  const motionProps = reducedMotion
    ? { initial: false as const }
    : {
        initial: { y: -8, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.25, ease: "easeOut" as const },
      };

  return (
    <motion.li layout={layout} {...motionProps} className="border-b border-[var(--mx-rule,#E2E8F0)]/20 px-3 py-3">
      <div
        className="rounded-lg border border-[var(--mx-violet,#7C3AED)]/30 bg-[rgba(212,160,23,0.1)] px-3 py-2.5"
        style={{ borderLeft: "4px solid var(--mx-violet, #7C3AED)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-sm font-semibold leading-snug text-white">
            {headline}
          </p>
          <time
            className="shrink-0 text-xs tabular-nums text-[var(--mx-muted,#9CA3AF)]"
            dateTime={event.occurred_at}
          >
            {formatLiveBoardTimeAgo(event.occurred_at, nowMs)}
          </time>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm tabular-nums">
          <span className="font-bold text-[var(--mx-violet,#7C3AED)]">
            {copy.winnerName}{" "}
            <span className="text-[var(--mx-gold,#D4A017)]">
              {formatDivisionWarAccuracyLine(copy.winnerAccuracyPct)}
            </span>
          </span>
          <span className="text-[var(--mx-muted,#9CA3AF)]">
            {copy.loserName}{" "}
            {formatDivisionWarAccuracyLine(copy.loserAccuracyPct)}
          </span>
        </div>
      </div>
    </motion.li>
  );
}

function ArenaFeedRow({
  event,
  nowMs,
  layout,
  reducedMotion,
}: {
  event: LiveBoardEventRow;
  nowMs: number;
  layout: boolean;
  reducedMotion: boolean | null;
}) {
  const nodeId = event.skill_node_id ?? event.id;
  const eventText = formatArenaBoardEventText(event);
  const motionProps = reducedMotion
    ? { initial: false as const }
    : {
        initial: { y: -8, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.25, ease: "easeOut" as const },
      };

  return (
    <motion.li
      layout={layout}
      {...motionProps}
      className="flex h-11 items-center gap-2.5 border-b border-[var(--mx-rule,#E2E8F0)]/20 px-3"
    >
      <MasteryNode
        nodeId={nodeId}
        nodeName={event.node_name}
        state={masteryStateFromEvent(event)}
        size="xs"
        accuracy={event.accuracy_pct ?? undefined}
        showGlow={masteryStateFromEvent(event) === "verified"}
      />
      <span className="shrink-0 text-sm font-semibold text-[var(--mx-violet,#7C3AED)]">
        {event.display_name.trim() || "Mentrixer"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-white">{eventText}</span>
      <time
        className="shrink-0 text-xs tabular-nums text-[var(--mx-muted,#9CA3AF)]"
        dateTime={event.occurred_at}
      >
        {formatLiveBoardTimeAgo(event.occurred_at, nowMs)}
      </time>
    </motion.li>
  );
}

type Props = {
  initialEvents: LiveBoardEventRow[];
};

export function ArenaBoardFeed({ initialEvents }: Props) {
  const reducedMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [events, setEvents] = useState(() => initialEvents.slice(0, ARENA_BOARD_FEED_LIMIT));
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setEvents(initialEvents.slice(0, ARENA_BOARD_FEED_LIMIT));
  }, [initialEvents]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("arena-board-events")
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
          setEvents((current) => {
            if (current.some((event) => event.id === row.id)) return current;
            return [row, ...current].slice(0, ARENA_BOARD_FEED_LIMIT);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const layoutEnabled = hydrated && !reducedMotion;

  return (
    <section aria-label="Live Arena feed" className="mt-8">
      <LandingStickyNote variant="taped" className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-[#E0E7FF] bg-[#EDE9FE]/80 px-4 py-3">
          <MentrixaVocabIcon name="verified" size={16} gold surface="light" title="Live feed" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6366F1]">
            {ARENA_PAGE_COPY.feedEyebrow}
          </p>
        </div>

        <div className="max-h-[min(50rem,70vh)] overflow-y-auto overscroll-contain bg-[var(--mx-navy,#0B1220)]">
          {!hydrated ? (
            <BklitShimmer
              className="m-3 h-48 rounded-lg border border-white/10"
              aria-label="Loading live feed"
            />
          ) : events.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--mx-muted,#9CA3AF)]">
              {ARENA_PAGE_COPY.emptyFeed}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--mx-rule,#E2E8F0)]/10">
              <AnimatePresence mode="sync" initial={false}>
                {events.map((event) =>
                  isDivisionWarLiveBoardEvent(event.event_type) ? (
                    <DivisionWarBoardRow
                      key={event.id}
                      event={event}
                      nowMs={nowMs}
                      layout={layoutEnabled}
                      reducedMotion={reducedMotion}
                    />
                  ) : (
                    <ArenaFeedRow
                      key={event.id}
                      event={event}
                      nowMs={nowMs}
                      layout={layoutEnabled}
                      reducedMotion={reducedMotion}
                    />
                  ),
                )}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </LandingStickyNote>
    </section>
  );
}

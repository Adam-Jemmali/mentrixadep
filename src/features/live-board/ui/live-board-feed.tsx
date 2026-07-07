"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/shared/integrations/supabase/client";
import {
  ARENA_PAGE_COPY,
  formatLiveBoardEventDescription,
  formatLiveBoardTimeAgo,
} from "@/features/live-board/live-board-messages-pure";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { easeOutExpo } from "@/features/marketing/landing/v2/motion/landing-motion";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";

const FEED_LIMIT = 50;
const ROW_ENTER_MS = 0.2;

type Props = {
  initialEvents: LiveBoardEventRow[];
};

function parseRealtimeRow(record: Record<string, unknown>): LiveBoardEventRow | null {
  const eventType = String(record.event_type ?? "");
  if (
    eventType !== "verified_attempt" &&
    eventType !== "rank_advance" &&
    eventType !== "breakthrough"
  ) {
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
    skill_node_id: record.skill_node_id ? String(record.skill_node_id) : null,
    node_name: String(record.node_name ?? ""),
    unit_name: String(record.unit_name ?? ""),
    accuracy_pct: Number.isFinite(accuracyPct) ? accuracyPct : null,
    new_rank_tier: record.new_rank_tier ? String(record.new_rank_tier) : null,
    is_first_attempt: Boolean(record.is_first_attempt),
    occurred_at: String(record.occurred_at ?? new Date().toISOString()),
  };
}

export function LiveBoardFeed({ initialEvents }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [events, setEvents] = useState(initialEvents);
  const [nowMs, setNowMs] = useState(() => Date.now());

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
        (
          payload: { new: Record<string, unknown> },
        ) => {
          const row = parseRealtimeRow(payload.new as Record<string, unknown>);
          if (!row) return;
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
  }, []);

  const rowMotion = useMemo(
    () =>
      reducedMotion
        ? {
            initial: { opacity: 1, y: 0 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 1, y: 0 },
            transition: { duration: 0 },
          }
        : {
            initial: { opacity: 0, y: -12 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: { duration: ROW_ENTER_MS, ease: easeOutExpo },
          },
    [reducedMotion],
  );

  return (
    <section aria-label="Live verified first attempt feed" className="mt-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6366F1]">
        {ARENA_PAGE_COPY.feedEyebrow}
      </p>

      <div className="mt-3 max-h-[min(52vh,28rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0F172A]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {events.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            {ARENA_PAGE_COPY.emptyFeed}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {events.map((event) => (
                <motion.li
                  key={event.id}
                  layout={!reducedMotion}
                  {...rowMotion}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm"
                >
                  <p className="min-w-0 flex-1 leading-relaxed text-slate-200">
                    <span className="font-semibold text-[#7C3AED]">{event.display_name}</span>{" "}
                    <span>{formatLiveBoardEventDescription(event)}</span>
                  </p>
                  <time
                    className="shrink-0 text-xs text-slate-500"
                    dateTime={event.occurred_at}
                  >
                    {formatLiveBoardTimeAgo(event.occurred_at, nowMs)}
                  </time>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}

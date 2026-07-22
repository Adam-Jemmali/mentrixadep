"use client";

import { useEffect, useState } from "react";
import {
  formatPublicFeedLine,
  type PublicFeedItem,
} from "@/features/arena-widget/public-feed-pure";
import { formatLiveBoardTimeAgo } from "@/features/live-board/live-board-messages-pure";
import { cn } from "@/shared/core/utils";

const REFRESH_MS = 30_000;

type Theme = "dark" | "light";

export function ArenaWidgetClient({
  theme,
  height,
  initialItems,
}: {
  theme: Theme;
  height: number;
  initialItems: PublicFeedItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/public/arena-feed", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: PublicFeedItem[] };
        if (!cancelled && Array.isArray(json.items)) {
          setItems(json.items);
        }
      } catch {
        // keep last good frame
      }
    };
    const id = window.setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const dark = theme === "dark";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        dark ? "bg-[#0B1220] text-white" : "bg-white text-[#0B1220]",
      )}
      style={{ height }}
    >
      <header
        className={cn(
          "flex items-center justify-between border-b px-3 py-2",
          dark ? "border-white/10" : "border-[#E0E7FF]",
        )}
      >
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.16em]",
            dark ? "text-[#A5B4FC]" : "text-[#6366F1]",
          )}
        >
          Live Arena
        </p>
        <a
          href="https://mentrixa.one/arena"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "text-[11px] font-semibold",
            dark ? "text-[#D4A017]" : "text-[#7C3AED]",
          )}
        >
          Mentrixa
        </a>
      </header>

      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {items.length === 0 ? (
          <li
            className={cn(
              "py-6 text-center text-sm",
              dark ? "text-slate-400" : "text-[#475569]",
            )}
          >
            No live events yet.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start justify-between gap-2 border-b py-2 last:border-0",
                dark ? "border-white/5" : "border-[#EEF2FF]",
              )}
            >
              <p
                className={cn(
                  "min-w-0 flex-1 text-sm font-semibold leading-snug",
                  dark ? "text-white" : "text-[#0B1220]",
                )}
              >
                {formatPublicFeedLine(item)}
              </p>
              <time
                className={cn(
                  "shrink-0 text-[11px] tabular-nums",
                  dark ? "text-slate-400" : "text-[#64748B]",
                )}
                dateTime={item.occurred_at}
              >
                {formatLiveBoardTimeAgo(item.occurred_at, nowMs)}
              </time>
            </li>
          ))
        )}
      </ul>

      <footer
        className={cn(
          "border-t px-3 py-1.5 text-center text-[10px] font-medium",
          dark ? "border-white/10 text-slate-500" : "border-[#E0E7FF] text-[#64748B]",
        )}
      >
        Powered by Mentrixa. first attempts only
      </footer>
    </div>
  );
}

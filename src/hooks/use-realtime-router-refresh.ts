"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type RealtimeTableConfig = {
  table: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
  /** e.g. `student_id=eq.<uuid>` — reduces noise and matches RLS-visible rows */
  filter?: string;
};

const DEFAULT_DEBOUNCE_MS = 650;

/**
 * Subscribe to Postgres changes and debounce `router.refresh()` so server components
 * (e.g. open slots, session requests) update without a manual reload.
 */
export function useRealtimeRouterRefresh(
  channelName: string,
  configs: RealtimeTableConfig[],
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): void {
  const router = useRouter();
  const configsKey = JSON.stringify(configs);

  useEffect(() => {
    const supabase = createClient();
    const timerRef = { current: null as ReturnType<typeof setTimeout> | null };

    const schedule = () => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        router.refresh();
      }, debounceMs);
    };

    const channel = supabase.channel(channelName);
    const parsed: RealtimeTableConfig[] = JSON.parse(configsKey) as RealtimeTableConfig[];
    for (const c of parsed) {
      channel.on(
        "postgres_changes",
        {
          event: c.event ?? "*",
          schema: c.schema ?? "public",
          table: c.table,
          ...(c.filter ? { filter: c.filter } : {}),
        },
        schedule,
      );
    }

    void channel.subscribe();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [router, channelName, configsKey, debounceMs]);
}

/**
 * When the user returns to the tab, refresh occasionally so any missed realtime still converges.
 */
export function useVisibilityRouterRefresh(intervalMs: number = 50_000): void {
  const router = useRouter();
  const lastAt = useRef(0);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastAt.current < intervalMs) return;
      lastAt.current = now;
      router.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [router, intervalMs]);
}

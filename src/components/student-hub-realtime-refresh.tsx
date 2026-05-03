"use client";

import { useMemo } from "react";
import { useRealtimeRouterRefresh, useVisibilityRouterRefresh } from "@/hooks/use-realtime-router-refresh";

/**
 * Keeps the learner dashboard (browse slots, sessions, requests) in sync when guides
 * add availability or booking state changes — no manual refresh.
 */
export function StudentHubRealtimeRefresh({ userId }: { userId: string }) {
  const configs = useMemo(
    () => [
      { table: "availability" as const },
      { table: "session_requests" as const, filter: `student_id=eq.${userId}` },
      { table: "sessions" as const, filter: `student_id=eq.${userId}` },
    ],
    [userId],
  );

  useRealtimeRouterRefresh(`student-hub:${userId}`, configs);
  useVisibilityRouterRefresh(55_000);

  return null;
}

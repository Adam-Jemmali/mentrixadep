"use client";

import { useMemo } from "react";
import { useRealtimeRouterRefresh, useVisibilityRouterRefresh } from "@/hooks/use-realtime-router-refresh";

/**
 * Keeps the guide center (slots, pending requests, calendar sessions) in sync when
 * learners book or sessions change — no manual refresh.
 */
export function TutorHubRealtimeRefresh({ tutorId }: { tutorId: string }) {
  const configs = useMemo(
    () => [
      { table: "availability" as const, filter: `tutor_id=eq.${tutorId}` },
      { table: "session_requests" as const, filter: `tutor_id=eq.${tutorId}` },
      { table: "sessions" as const, filter: `tutor_id=eq.${tutorId}` },
    ],
    [tutorId],
  );

  useRealtimeRouterRefresh(`tutor-hub:${tutorId}`, configs);
  useVisibilityRouterRefresh(55_000);

  return null;
}

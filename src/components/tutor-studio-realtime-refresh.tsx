"use client";

import { useMemo } from "react";
import { useRealtimeRouterRefresh, useVisibilityRouterRefresh } from "@/hooks/use-realtime-router-refresh";

/** Studio list + package rows update when generation finishes or session rows change. */
export function TutorStudioRealtimeRefresh({ tutorId }: { tutorId: string }) {
  const configs = useMemo(
    () => [
      { table: "session_ai_packages" as const },
      { table: "sessions" as const, filter: `tutor_id=eq.${tutorId}` },
    ],
    [tutorId],
  );

  useRealtimeRouterRefresh(`tutor-studio:${tutorId}`, configs);
  useVisibilityRouterRefresh(60_000);

  return null;
}

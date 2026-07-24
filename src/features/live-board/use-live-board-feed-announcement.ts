"use client";

import { useCallback, useEffect, useState } from "react";
import { formatLiveBoardEventAnnouncement } from "@/features/live-board/live-board-messages-pure";
import type { LiveBoardEventRow } from "@/features/live-board/types";

const DEFAULT_CLEAR_MS = 10_000;

export function useLiveBoardFeedAnnouncement(clearMs = DEFAULT_CLEAR_MS) {
  const [announcement, setAnnouncement] = useState("");

  const announceEvent = useCallback((event: LiveBoardEventRow) => {
    setAnnouncement(formatLiveBoardEventAnnouncement(event));
  }, []);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(""), clearMs);
    return () => window.clearTimeout(timer);
  }, [announcement, clearMs]);

  return { announcement, announceEvent };
}

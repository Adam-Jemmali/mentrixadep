"use client";

import { useCallback, useRef } from "react";
import type { AnalyticsEventName, EventProperties } from "@/lib/analytics";

// Stable browser session ID — generated once per tab session
function getOrCreateSessionId(): string {
  if (typeof sessionStorage === "undefined") return "";
  const KEY = "mentrixa_sid";
  let sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(KEY, sid);
  }
  return sid;
}

export function useTrack() {
  // Deduplicate in-flight requests to avoid double-fires on StrictMode double-invoke
  const inflight = useRef(new Set<string>());

  const track = useCallback(
    (eventName: AnalyticsEventName, properties?: EventProperties) => {
      const key = `${eventName}:${JSON.stringify(properties ?? {})}`;
      if (inflight.current.has(key)) return;
      inflight.current.add(key);

      const sid = getOrCreateSessionId();

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventName, sessionId: sid, properties }),
        keepalive: true,
      })
        .catch(() => {}) // Never let analytics break the UI
        .finally(() => inflight.current.delete(key));
    },
    []
  );

  return track;
}

/**
 * Fire-and-forget helper for non-hook contexts (event handlers, callbacks).
 * Does not deduplicate.
 */
export function trackClientEvent(
  eventName: AnalyticsEventName,
  properties?: EventProperties
): void {
  if (typeof window === "undefined") return;
  const sid = getOrCreateSessionId();
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ eventName, sessionId: sid, properties }),
    keepalive: true,
  }).catch(() => {});
}

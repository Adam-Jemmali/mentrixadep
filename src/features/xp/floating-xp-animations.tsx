"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onXpAward, type XpAwardEvent } from "@/features/xp/xp-events";
import { useUiPerfTier } from "@/shared/core/use-ui-perf-tier";
import { XpRewardCelebration } from "@/features/xp/components/xp-reward-celebration";

type QueuedXpEvent = XpAwardEvent & { id: string };

export function FloatingXpAnimations() {
  const tier = useUiPerfTier();
  const lite = tier === "lite";
  const [activeEvent, setActiveEvent] = useState<QueuedXpEvent | null>(null);
  const queueRef = useRef<QueuedXpEvent[]>([]);
  const showingRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);
  const eventIdRef = useRef(0);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      showingRef.current = true;
      setActiveEvent(next);
      return;
    }
    showingRef.current = false;
    setActiveEvent(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setActiveEvent(null);
    if (dismissTimerRef.current != null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null;
      showNext();
    }, 220);
  }, [showNext]);

  useEffect(() => {
    const unsubscribe = onXpAward((event: XpAwardEvent) => {
      if (event.amount <= 0) return;
      const queued: QueuedXpEvent = { ...event, id: `xp-${eventIdRef.current++}` };
      if (showingRef.current) {
        queueRef.current.push(queued);
        return;
      }
      showingRef.current = true;
      setActiveEvent(queued);
    });

    return () => {
      unsubscribe();
      if (dismissTimerRef.current != null) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  return (
    <XpRewardCelebration event={activeEvent} lite={lite} onDismiss={handleDismiss} />
  );
}

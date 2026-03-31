"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches server components without a full page reload.
 * - Refreshes when the user returns to the tab (e.g. after Stripe or another tab).
 * - Optional `pollMs` periodically refreshes lists (duels, availability, registrations) without manual reload.
 */
export function RefreshRouter({ pollMs }: { pollMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    let interval: ReturnType<typeof setInterval> | undefined;
    if (pollMs != null && pollMs > 0) {
      interval = setInterval(() => {
        router.refresh();
      }, pollMs);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (interval) clearInterval(interval);
    };
  }, [router, pollMs]);

  return null;
}

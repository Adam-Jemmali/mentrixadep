"use client";

import { startTransition } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Avoid Next.js 16 "Router action dispatched before initialization" by deferring refresh
 * until after the current commit / paint.
 */
export function safeRouterRefresh(router: AppRouterInstance): void {
  if (typeof window === "undefined") return;

  const run = () => {
    startTransition(() => {
      try {
        router.refresh();
      } catch {
        /* swallow — a follow-up navigation or poll will reconcile */
      }
    });
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(run);
  } else {
    setTimeout(run, 0);
  }
}

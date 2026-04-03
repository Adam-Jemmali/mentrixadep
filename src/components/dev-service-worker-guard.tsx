"use client";

import { useEffect } from "react";

/**
 * Runs on every route (including marketing `/`). The PWA `sw.js` cache-firsts `/_next/static/*`;
 * with webpack HMR that yields stale chunks and broken module factories. Unregister in dev so
 * `npm run dev` matches `dev:turbo` reliability. Production is unchanged.
 */
export function DevServiceWorkerGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys.filter((k) => k.toLowerCase().includes("mentrixa")).map((k) => caches.delete(k)),
          );
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);
  return null;
}

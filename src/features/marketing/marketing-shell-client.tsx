"use client";

import { useLayoutEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";

const CookieConsentBanner = dynamic(
  () => import("@/components/cookie-consent-banner").then((m) => m.CookieConsentBanner),
  { ssr: false, loading: () => null },
);

/**
 * Minimal client boundary for `/` only — no Supabase, nav, dialogs, PWA, or logo cursor trail.
 * Keeps Next dev webpack from pulling the full app shell into the landing chunk graph.
 */
export function MarketingShellClient({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <CookieConsentBanner />
      <main className="relative min-h-screen bg-[#0B1220] text-slate-100">
        <div className="relative z-10">{children}</div>
      </main>
    </>
  );
}

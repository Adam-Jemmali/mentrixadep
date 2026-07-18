"use client";

import { useLayoutEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";

const MentrixaCursor = dynamic(
  () => import("@/shared/ui/tech-cursor").then((m) => m.MentrixaCursor),
  { ssr: false, loading: () => null },
);

const CookieConsentBanner = dynamic(
  () => import("@/components/cookie-consent-banner").then((m) => m.CookieConsentBanner),
  { ssr: false, loading: () => null },
);

/**
 * Minimal client boundary for `/` only — no Supabase, nav, dialogs, or PWA hooks.
 * Keeps Next dev webpack from pulling the full app shell into the landing chunk graph
 * (avoids `options.factory` / undefined module factory errors + white screen).
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
      <MentrixaCursor />
      <CookieConsentBanner />
      <main className="relative min-h-screen bg-[radial-gradient(1200px_560px_at_50%_-18%,rgba(99,102,241,0.28),transparent_60%),linear-gradient(180deg,#070d1a_0%,#0b1220_48%,#111827_100%)] text-slate-100">
        <div className="relative z-10">{children}</div>
      </main>
    </>
  );
}

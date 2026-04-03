"use client";

import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

/**
 * Minimal client boundary for `/` only — no Supabase, nav, dialogs, or PWA hooks.
 * Keeps Next dev webpack from pulling the full app shell into the landing chunk graph
 * (avoids `options.factory` / undefined module factory errors + white screen).
 */
export function MarketingShellClient({ children }: { children: ReactNode }) {
  return (
    <>
      <CookieConsentBanner />
      <main className="relative min-h-screen bg-[#0B1120]">{children}</main>
    </>
  );
}

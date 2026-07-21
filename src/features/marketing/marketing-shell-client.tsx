"use client";

import { useLayoutEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";

const LenisProvider = dynamic(
  () => import("@/shared/animation/lenis-provider").then((m) => m.LenisProvider),
  { ssr: false },
);

const MentrixaCursor = dynamic(
  () => import("@/shared/ui/tech-cursor").then((m) => m.MentrixaCursor),
  { ssr: false, loading: () => null },
);

const CookieConsentBanner = dynamic(
  () => import("@/components/cookie-consent-banner").then((m) => m.CookieConsentBanner),
  { ssr: false, loading: () => null },
);

/**
 * Minimal client boundary for `/` — single Mentrixa logo cursor (no trail), no app shell.
 */
export function MarketingShellClient({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <LenisProvider>
      <MentrixaCursor />
      <CookieConsentBanner />
      <main className="relative min-h-screen bg-[#0B1220] text-slate-100">
        <div className="relative z-10">{children}</div>
      </main>
    </LenisProvider>
  );
}

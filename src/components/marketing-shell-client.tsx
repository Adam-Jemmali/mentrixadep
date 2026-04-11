"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

/**
 * Minimal client boundary for `/` only — no Supabase, nav, dialogs, or PWA hooks.
 * Keeps Next dev webpack from pulling the full app shell into the landing chunk graph
 * (avoids `options.factory` / undefined module factory errors + white screen).
 */
export function MarketingShellClient({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const forceTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    forceTop();
    const rafOne = window.requestAnimationFrame(() => {
      forceTop();
      const rafTwo = window.requestAnimationFrame(forceTop);
      window.setTimeout(forceTop, 0);
      void rafTwo;
    });

    const onPageShow = () => forceTop();
    window.addEventListener("pageshow", onPageShow);

    const reveal = window.requestAnimationFrame(() => {
      setReady(true);
    });

    return () => {
      window.cancelAnimationFrame(rafOne);
      window.cancelAnimationFrame(reveal);
      window.removeEventListener("pageshow", onPageShow);
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  return (
    <>
      <CookieConsentBanner />
      <main
        className="relative min-h-screen bg-[#0B1120]"
        style={{ opacity: ready ? 1 : 0, transition: "opacity 1ms linear" }}
      >
        {children}
      </main>
    </>
  );
}

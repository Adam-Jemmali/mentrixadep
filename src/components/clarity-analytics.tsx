"use client";

import { useEffect } from "react";

const CLARITY_ID = "w7032mq4bu";

/**
 * Load Microsoft Clarity after mount so it does not run during SSR or before hydration
 * (third‑party scripts in <head> can cause React text mismatch / error #425).
 */
export function ClarityAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (process.env.NEXT_PUBLIC_CLARITY_ENABLED === "false") return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      if (document.querySelector(`script[src*="clarity.ms/tag/${CLARITY_ID}"]`)) return;
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
      document.head.appendChild(s);
    };
    // Defer until after paint + hydration to reduce React #425 text mismatches with third-party DOM.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  return null;
}

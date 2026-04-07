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
    if (document.querySelector(`script[src*="clarity.ms/tag/${CLARITY_ID}"]`)) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
    document.head.appendChild(s);
  }, []);

  return null;
}

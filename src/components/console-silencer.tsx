"use client";

import { useEffect } from "react";

/**
 * A utility component to silence noisy, unactionable console warnings/errors
 * from third-party libraries (like Framer Motion's static container warning)
 * and Chrome extensions (like React/Apollo DevTools).
 */
export function ConsoleSilencer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const msg = args.join(" ");
      // Silence React/Apollo/Grammarly DevTools extension noise
      if (msg.includes("tabs:outgoing.message.ready")) return;
      if (msg.includes("Cannot read properties of null (reading 'cssRules')")) return;
      if (msg.includes("Property 'cssRules' of object 'CSSStyleSheet' is not accessible")) return;
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const msg = args.join(" ");
      // Silence Framer Motion's internal useScroll warning
      if (msg.includes("non-static position, like 'relative'")) return;
      if (msg.includes("Duplicate presence of slot")) return;
      originalWarn.apply(console, args);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason && 
        typeof event.reason.message === "string" && 
        event.reason.message.includes("tabs:outgoing.message.ready")
      ) {
        event.preventDefault(); // This stops the browser from logging it to the console!
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

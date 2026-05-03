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

    const isExtensionNoListenerNoise = (value: unknown) => {
      const text = String(value ?? "");
      return (
        text.includes("tabs:outgoing.message.ready") ||
        (text.includes("No Listener") && text.includes("tabs:outgoing.message.ready"))
      );
    };

    /** Walk Error / nested cause so we can detect chrome-extension:// stacks (e.g. vendor.js from an extension). */
    const stringifyReasonChain = (reason: unknown, depth = 0): string => {
      if (depth > 6) return "";
      if (reason == null) return "";
      if (typeof reason === "string") return reason;
      if (reason instanceof Error) {
        const base = `${reason.message}\n${reason.stack ?? ""}`;
        const c = "cause" in reason ? (reason as Error & { cause?: unknown }).cause : undefined;
        return c != null ? `${base}\n${stringifyReasonChain(c, depth + 1)}` : base;
      }
      if (typeof reason === "object") {
        try {
          const r = reason as Record<string, unknown>;
          const msg = r.message != null ? String(r.message) : "";
          const stack = r.stack != null ? String(r.stack) : "";
          const cause = r.cause;
          return `${msg}\n${stack}\n${cause != null ? stringifyReasonChain(cause, depth + 1) : ""}`;
        } catch {
          return String(reason);
        }
      }
      return String(reason);
    };

    const isExtensionRuntimeNoise = (reason: unknown): boolean => {
      const text = stringifyReasonChain(reason);
      return (
        text.includes("chrome-extension://") ||
        text.includes("moz-extension://") ||
        text.includes("safari-web-extension://")
      );
    };

    const shouldSuppressRejection = (reason: unknown): boolean =>
      isExtensionNoListenerNoise(reason) ||
      isExtensionRuntimeNoise(reason) ||
      isExtensionNoListenerNoise(stringifyReasonChain(reason));

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: unknown; cause?: unknown } | unknown;
      const message = typeof reason === "object" && reason !== null ? (reason as { message?: unknown }).message : undefined;
      const cause = typeof reason === "object" && reason !== null ? (reason as { cause?: unknown }).cause : undefined;
      if (
        shouldSuppressRejection(reason) ||
        isExtensionNoListenerNoise(message) ||
        isExtensionNoListenerNoise(cause) ||
        isExtensionRuntimeNoise(message) ||
        isExtensionRuntimeNoise(cause)
      ) {
        event.preventDefault(); // Stop extension noise from polluting app debugging.
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      const fromExtensionFile =
        typeof event.filename === "string" &&
        (event.filename.includes("chrome-extension://") ||
          event.filename.includes("moz-extension://") ||
          event.filename.includes("safari-web-extension://"));
      if (
        fromExtensionFile ||
        isExtensionNoListenerNoise(event.message) ||
        isExtensionNoListenerNoise(event.error) ||
        isExtensionRuntimeNoise(event.error) ||
        isExtensionRuntimeNoise(event.message)
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useRef, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useLowEndMode() {
  const [lowEnd, setLowEnd] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
    const deviceMemory = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number"
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory!
      : 8;
    const isSlowNetwork = connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g";
    const nextLowEnd =
      Boolean(connection?.saveData) ||
      isSlowNetwork ||
      cores <= 4 ||
      deviceMemory <= 4;
    setLowEnd(nextLowEnd);
  }, []);

  return lowEnd;
}

export function useSectionScrollProgress(sectionId: string, threshold = 0.01) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    const update = () => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollable = Math.max(section.scrollHeight - window.innerHeight, 1);
      const next = clamp(-rect.top / scrollable, 0, 1);
      if (Math.abs(next - lastProgressRef.current) >= threshold) {
        lastProgressRef.current = next;
        setProgress(next);
      }
    };

    const onScrollOrResize = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sectionId, threshold]);

  return progress;
}

export function useLandingPerfMetrics(enabled = true) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !enabled || typeof window === "undefined") return;

    const state = {
      longTasks: 0,
      longTaskTotalMs: 0,
      droppedFramesEstimate: 0,
      lastRafTs: 0,
      frameCount: 0,
    };

    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.longTasks += 1;
        state.longTaskTotalMs += entry.duration;
      }
    });

    try {
      longTaskObserver.observe({ type: "longtask", buffered: true });
    } catch {
      return;
    }

    let rafId = 0;
    const frameLoop = (ts: number) => {
      if (state.lastRafTs > 0) {
        const delta = ts - state.lastRafTs;
        // Over ~20ms budget indicates missed 60fps frame(s)
        if (delta > 20) {
          state.droppedFramesEstimate += Math.max(1, Math.round(delta / 16.67) - 1);
        }
      }
      state.lastRafTs = ts;
      state.frameCount += 1;
      rafId = window.requestAnimationFrame(frameLoop);
    };
    rafId = window.requestAnimationFrame(frameLoop);

    const report = () => {
      const payload = {
        longTasks: state.longTasks,
        longTaskTotalMs: Math.round(state.longTaskTotalMs),
        droppedFramesEstimate: state.droppedFramesEstimate,
        sampledFrames: state.frameCount,
      };
      // Exposed for profiling verification and QA checks.
      (window as Window & { __landingPerf?: typeof payload }).__landingPerf = payload;
      if (process.env.NODE_ENV !== "production") {
        const debug =
          typeof window !== "undefined" &&
          window.localStorage?.getItem("mentrixa-landing-debug") === "1";
        if (debug) console.info("[LandingPerf]", payload);
      }
    };

    window.addEventListener("beforeunload", report);
    const vis = () => {
      if (document.visibilityState === "hidden") report();
    };
    document.addEventListener("visibilitychange", vis);

    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("beforeunload", report);
      if (rafId) window.cancelAnimationFrame(rafId);
      report();
      longTaskObserver.disconnect();
    };
  }, [enabled]);
}

export function markLandingSection(sectionId: string, label: string) {
  if (process.env.NODE_ENV === "production") return () => {};
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return () => {};
  const section = document.getElementById(sectionId);
  if (!section) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          performance.mark(`landing:${label}:enter`);
          if (process.env.NODE_ENV !== "production") {
            const debug =
              typeof window !== "undefined" &&
              window.localStorage?.getItem("mentrixa-landing-debug") === "1";
            if (debug) console.info(`[LandingMark] ${label} enter`);
          }
        } else {
          performance.mark(`landing:${label}:exit`);
        }
      }
    },
    { threshold: 0.2 }
  );
  observer.observe(section);
  return () => observer.disconnect();
}

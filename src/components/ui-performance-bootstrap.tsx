"use client";

import { useEffect } from "react";
import { syncUiPerfDataset } from "@/shared/core/ui-performance";

/** Keeps `html[data-mentrixa-perf]` in sync for CSS and mirrors tier changes (reduced-motion toggles). */
export function UiPerformanceBootstrap() {
  useEffect(() => {
    syncUiPerfDataset();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => syncUiPerfDataset();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}

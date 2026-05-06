"use client";

import { useEffect, useState } from "react";
import { readUiPerfTier, type UiPerfTier, syncUiPerfDataset } from "@/lib/ui-performance";

/**
 * Client-only tier for conditional rendering (BubbleText, Nav hover chrome, XP flyout, etc.).
 */
export function useUiPerfTier(): UiPerfTier {
  const [tier, setTier] = useState<UiPerfTier>("full");

  useEffect(() => {
    const apply = () => {
      const next = readUiPerfTier();
      syncUiPerfDataset();
      setTier(next);
    };
    apply();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return tier;
}

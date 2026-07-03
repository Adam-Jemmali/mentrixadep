"use client";

import { useEffect } from "react";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";

/** Preload KaTeX on duel routes so item-bank math renders without a visible flash. */
export function DuelRouteWarmup({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void warmKatex();
  }, []);

  return children;
}

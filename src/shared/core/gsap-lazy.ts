"use client";

import { useEffect } from "react";
import type { DependencyList } from "react";

type Gsap = typeof import("gsap").gsap;

/**
 * Dynamic GSAP loader for authenticated app routes — keeps gsap out of the app shell entry chunk.
 * Marketing / landing code should import `@/shared/core/gsap` instead.
 */
export function useGsapEffect(
  effect: (gsap: Gsap) => void | (() => void),
  deps: DependencyList,
): void {
  useEffect(() => {
    let active = true;
    let cleanup: void | (() => void);

    void import("gsap").then(({ gsap }) => {
      if (!active) return;
      cleanup = effect(gsap);
    });

    return () => {
      active = false;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps
  }, deps);
}

export async function loadGsapWithScrollTrigger(): Promise<{
  gsap: Gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
}> {
  const [g, st] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);
  g.gsap.registerPlugin(st.ScrollTrigger);
  return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger };
}

/** Fire and forget GSAP in event handlers (tab clicks, row collapse, etc.). */
export function runGsapAction(fn: (gsap: Gsap) => void): void {
  void import("gsap").then(({ gsap }) => fn(gsap));
}

export function useGsapScrollTriggerEffect(
  effect: (
    gsap: Gsap,
    ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger,
  ) => void | (() => void),
  deps: DependencyList,
): void {
  useEffect(() => {
    let active = true;
    let cleanup: void | (() => void);

    void loadGsapWithScrollTrigger().then(({ gsap, ScrollTrigger }) => {
      if (!active) return;
      cleanup = effect(gsap, ScrollTrigger);
    });

    return () => {
      active = false;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { LANDING_HERO } from "@/features/marketing/landing/landing-copy-pure";

type Props = {
  className?: string;
};

function HeroHeadlineStatic({ className }: Props) {
  return (
    <h1 className={className} aria-label={LANDING_HERO.ariaLabel}>
      <span className="block">{LANDING_HERO.line1}</span>
      <span className="block">
        {LANDING_HERO.line2Prefix}
        {LANDING_HERO.line2Highlight}.
      </span>
    </h1>
  );
}

const HeroHeadlineAnimated = dynamic(
  () =>
    import("@/features/marketing/landing/v2/sections/hero-headline-animated").then(
      (m) => m.HeroHeadlineAnimated,
    ),
  { ssr: false },
);

export function HeroHeadline({ className }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setAnimReady(true);
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(enable, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(enable, 200);
    }
    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [reducedMotion]);

  if (!animReady) {
    return <HeroHeadlineStatic className={className} />;
  }

  return <HeroHeadlineAnimated className={className} />;
}

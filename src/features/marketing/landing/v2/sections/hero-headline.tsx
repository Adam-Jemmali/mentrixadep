"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { HeroHeadlineAnimated } from "@/features/marketing/landing/v2/sections/hero-headline-animated";
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

export function HeroHeadline({ className }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    if (reducedMotion !== true) {
      setAnimReady(true);
    }
  }, [reducedMotion]);

  if (!animReady) {
    return <HeroHeadlineStatic className={className} />;
  }

  return <HeroHeadlineAnimated className={className} />;
}

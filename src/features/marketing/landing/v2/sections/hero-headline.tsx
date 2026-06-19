"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { HeroHeadlineAnimated } from "@/features/marketing/landing/v2/sections/hero-headline-animated";

type Props = {
  className?: string;
};

const FULL_LABEL = "You never find out if you are good at what you are building.";

function HeroHeadlineStatic({ className }: Props) {
  return (
    <h1 className={className} aria-label={FULL_LABEL}>
      <span className="block">You never find out</span>
      <span className="block">if you are good</span>
      <span className="block">at what you are building.</span>
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

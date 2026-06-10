"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { HeroHeadlineAnimated } from "@/features/marketing/landing/v2/sections/hero-headline-animated";

type Props = {
  className?: string;
};

const FULL_LABEL = "Every skill you are building deserves a rank.";

function HeroHeadlineStatic({ className }: Props) {
  return (
    <h1 className={className} aria-label={FULL_LABEL}>
      <span className="block">Every skill you are</span>
      <span className="block">building deserves</span>
      <span className="block">a rank.</span>
    </h1>
  );
}

export function HeroHeadline({ className }: Props) {
  const reducedMotion = useReducedMotion();
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

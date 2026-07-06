"use client";

import { useCallback, useState } from "react";
import { BrandTypewriter } from "@/features/marketing/ui/brand-typewriter";
import { LANDING_HERO } from "@/features/marketing/landing/landing-copy-pure";

type Props = {
  className?: string;
};

export function HeroHeadlineAnimated({ className }: Props) {
  const [revealed, setRevealed] = useState(false);

  const advance = useCallback(() => {
    setRevealed(true);
  }, []);

  return (
    <h1 className={className} aria-label={LANDING_HERO.ariaLabel}>
      <span className="block">{LANDING_HERO.line1}</span>
      <span className="block">
        {LANDING_HERO.line2Prefix}
        {!revealed ? (
          <BrandTypewriter text={LANDING_HERO.line2Highlight} loop={false} onComplete={advance} />
        ) : (
          <span className="inline bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 bg-clip-text pe-[0.2em] text-transparent [box-decoration-break:clone]">
            {LANDING_HERO.line2Highlight}
          </span>
        )}
        .
      </span>
    </h1>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { BrandTypewriter } from "@/components/brand-typewriter";

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
  const [step, setStep] = useState(0);

  const advance = useCallback(() => {
    setStep((s) => Math.min(s + 1, 3));
  }, []);

  if (reducedMotion) {
    return <HeroHeadlineStatic className={className} />;
  }

  return (
    <h1 className={className} aria-label={FULL_LABEL}>
      <span className="block">
        Every{" "}
        {step === 0 ? (
          <BrandTypewriter text="skill" gradient={false} loop={false} onComplete={advance} />
        ) : (
          "skill"
        )}{" "}
        you are
      </span>

      <span className="block">
        building{" "}
        {step < 2 ? (
          step === 1 ? (
            <BrandTypewriter text="deserves" loop={false} onComplete={advance} />
          ) : (
            <span className="invisible select-none" aria-hidden>
              deserves
            </span>
          )
        ) : (
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            deserves
          </span>
        )}
      </span>

      <span className="block">
        {step < 3 ? (
          step === 2 ? (
            <BrandTypewriter text="a rank" loop={false} onComplete={advance} />
          ) : (
            <span className="invisible select-none" aria-hidden>
              a rank
            </span>
          )
        ) : (
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            a rank
          </span>
        )}
        .
      </span>
    </h1>
  );
}

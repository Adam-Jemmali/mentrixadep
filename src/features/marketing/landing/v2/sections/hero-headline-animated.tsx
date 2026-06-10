"use client";

import { useCallback, useState } from "react";
import { BrandTypewriter } from "@/features/marketing/ui/brand-typewriter";

const FULL_LABEL = "Every skill you are building deserves a rank.";

type Props = {
  className?: string;
};

export function HeroHeadlineAnimated({ className }: Props) {
  const [step, setStep] = useState(0);

  const advance = useCallback(() => {
    setStep((s) => Math.min(s + 1, 3));
  }, []);

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

"use client";

import { useCallback, useState } from "react";
import { BrandTypewriter } from "@/features/marketing/ui/brand-typewriter";

const FULL_LABEL = "You never find out if you are good at what you are building.";

type Props = {
  className?: string;
};

export function HeroHeadlineAnimated({ className }: Props) {
  const [step, setStep] = useState(0);

  const advance = useCallback(() => {
    setStep((s) => Math.min(s + 1, 2));
  }, []);

  return (
    <h1 className={className} aria-label={FULL_LABEL}>
      <span className="block">You never find out</span>

      <span className="block">
        if you are{" "}
        {step < 1 ? (
          step === 0 ? (
            <BrandTypewriter text="good" loop={false} onComplete={advance} />
          ) : (
            <span className="invisible select-none" aria-hidden>
              good
            </span>
          )
        ) : (
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            good
          </span>
        )}
      </span>

      <span className="block">
        at what you are{" "}
        {step < 2 ? (
          step === 1 ? (
            <BrandTypewriter text="building" loop={false} onComplete={advance} />
          ) : (
            <span className="invisible select-none" aria-hidden>
              building
            </span>
          )
        ) : (
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            building
          </span>
        )}
        .
      </span>
    </h1>
  );
}

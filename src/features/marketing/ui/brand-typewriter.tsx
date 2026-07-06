"use client";

import { cn } from "@/shared/core/utils";
import { Typewriter } from "@/shared/ui/typewriter";
import { BRAND_TYPEWRITER } from "@/features/marketing/brand-typewriter";

type Props = {
  text: string;
  className?: string;
  /** Same indigo → purple gradient clip as navbar Mentrixa */
  gradient?: boolean;
  loop?: boolean;
  waitTime?: number;
  initialDelay?: number;
  onComplete?: () => void;
};

/** Exact navbar Mentrixa typewriter styling — reuse for hero keywords */
export function BrandTypewriter({
  text,
  className,
  gradient = true,
  loop = true,
  waitTime = BRAND_TYPEWRITER.waitTime,
  initialDelay = 0,
  onComplete,
}: Props) {
  const typewriter = (
    <Typewriter
      text={text}
      speed={BRAND_TYPEWRITER.speed}
      waitTime={waitTime}
      loop={loop}
      initialDelay={initialDelay}
      cursorChar={BRAND_TYPEWRITER.cursorChar}
      cursorClassName={BRAND_TYPEWRITER.cursorClassName}
      onComplete={onComplete}
    />
  );

  if (!gradient) {
    return <span className={cn("inline", className)}>{typewriter}</span>;
  }

  return (
    <span
      className={cn(
        "inline bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 bg-clip-text pe-[0.2em] text-transparent [box-decoration-break:clone]",
        className,
      )}
    >
      {typewriter}
    </span>
  );
}

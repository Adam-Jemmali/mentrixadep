"use client";

import * as React from "react";
import { cn } from "@/shared/core/utils";

interface GooeyTextProps {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  className?: string;
  textClassName?: string;
}

export function GooeyText({
  texts: rawTexts,
  morphTime = 1.5,
  cooldownTime = 2,
  className,
  textClassName
}: GooeyTextProps) {
  const text1Ref = React.useRef<HTMLSpanElement>(null);
  const text2Ref = React.useRef<HTMLSpanElement>(null);
  const id = React.useId().replace(/:/g, ""); // Unique ID for filter

  const texts = React.useMemo(() => rawTexts.filter(t => t.trim().length > 0), [rawTexts]);
  const textsString = React.useMemo(() => JSON.stringify(texts), [texts]);
  const hasMultipleTexts = texts.length > 1;

  React.useEffect(() => {
    if (!hasMultipleTexts) {
      if (text1Ref.current) {
        text1Ref.current.textContent = texts[0] || "";
        text1Ref.current.style.opacity = "100%";
        text1Ref.current.style.filter = "";
      }
      return;
    }

    let textIndex = texts.length - 1;
    let lastTime = performance.now();
    let morph = 0;
    let cooldown = cooldownTime;

    const setMorph = (fraction: number) => {
      if (text1Ref.current && text2Ref.current) {
        const blur2 = (1 - fraction) * 12;
        const blur1 = fraction * 12;

        text2Ref.current.style.filter = `blur(${blur2}px)`;
        text2Ref.current.style.opacity = `${Math.pow(fraction, 0.4)}`;

        text1Ref.current.style.filter = `blur(${blur1}px)`;
        text1Ref.current.style.opacity = `${Math.pow(1 - fraction, 0.4)}`;
      }
    };

    const doCooldown = () => {
      morph = 0;
      if (text1Ref.current && text2Ref.current) {
        text2Ref.current.style.filter = "";
        text2Ref.current.style.opacity = "1";
        text1Ref.current.style.filter = "";
        text1Ref.current.style.opacity = "0";
      }
    };

    let animationFrameId: number;

    function animate(currentTime: number) {
      animationFrameId = requestAnimationFrame(animate);
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      cooldown -= dt;

      if (cooldown <= 0) {
        const shouldIncrementIndex = cooldown + dt > 0;
        if (shouldIncrementIndex) {
          textIndex = (textIndex + 1) % texts.length;
          if (text1Ref.current && text2Ref.current) {
            text1Ref.current.textContent = texts[textIndex] || "";
            text2Ref.current.textContent = texts[(textIndex + 1) % texts.length] || "";
          }
        }

        morph += dt;
        let fraction = morph / morphTime;

        if (fraction >= 1) {
          cooldown = cooldownTime;
          fraction = 1;
        }

        setMorph(fraction);
      } else {
        doCooldown();
      }
    }

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [textsString, morphTime, cooldownTime, texts, hasMultipleTexts]);

  return (
    <div className={cn("relative flex items-center h-full", className)}>
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={`threshold-${id}`}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 20 -10"
            />
          </filter>
        </defs>
      </svg>

      <div
        className={cn("relative flex items-center w-full h-full", className)}
        style={{ filter: `url(#threshold-${id})` }}
      >
        <span
          ref={text1Ref}
          className={cn(
            "absolute inset-0 flex items-center select-none justify-center",
            "text-foreground leading-none whitespace-nowrap will-change-[transform,filter,opacity]",
            textClassName
          )}
        />
        {hasMultipleTexts && (
          <span
            ref={text2Ref}
            className={cn(
              "absolute inset-0 flex items-center select-none justify-center",
              "text-foreground leading-none whitespace-nowrap will-change-[transform,filter,opacity]",
              textClassName
            )}
          />
        )}
      </div>
    </div>
  );
}



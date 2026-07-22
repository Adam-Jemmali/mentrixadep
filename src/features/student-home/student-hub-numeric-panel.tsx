"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LandingNumberWatermark } from "@/features/marketing/landing/ui/landing-number-heading";
import {
  LP_NUM,
  LP_NUM_STAT_VALUE_CLASS,
  LP_NUM_TITLE_CLASS,
} from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { useLandingNumericReveal } from "@/features/marketing/landing/ui/use-landing-numeric-reveal";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { formatXpCompactK } from "@/shared/core/copy-format";
import { cn } from "@/shared/core/utils";

/** Scroll reveal for student home numeric blocks — same motion as landing proof. */
export function StudentHubNumericReveal({
  children,
  className,
  animateValues = true,
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  animateValues?: boolean;
  /** Reveal on mount (e.g. 3D passport Html — no scroll intersection). */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  useLandingNumericReveal(ref, { start: "top 82%", animateValues, immediate });

  useEffect(() => {
    if (!immediate) return;
    const root = ref.current;
    if (!root || reducedMotion || !animateValues) return;

    let cancelled = false;

    void import("@/shared/animation/anime").then(({ animate }) => {
      if (cancelled) return;
      root.querySelectorAll<HTMLElement>(`.${LP_NUM.value}`).forEach((el) => {
        const end = Number(el.dataset.value ?? 0);
        const suffix = el.dataset.suffix ?? "";
        const format = el.dataset.format ?? "default";
        const obj = { val: 0 };
        animate(obj, {
          val: end,
          duration: 1.1,
          ease: "outExpo",
          onUpdate: () => {
            if (format === "xp-k") {
              el.textContent = formatXpCompactK(Math.round(obj.val));
              return;
            }
            el.textContent = `${Math.round(obj.val).toLocaleString()}${suffix}`;
          },
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [animateValues, immediate, reducedMotion]);

  useEffect(() => {
    if (immediate) return;
    const root = ref.current;
    if (!root || reducedMotion || !animateValues) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer?.disconnect();

        void import("@/shared/animation/anime").then(({ animate }) => {
          if (cancelled) return;
          root.querySelectorAll<HTMLElement>(`.${LP_NUM.value}`).forEach((el) => {
            const end = Number(el.dataset.value ?? 0);
            const suffix = el.dataset.suffix ?? "";
            const format = el.dataset.format ?? "default";
            const obj = { val: 0 };
            animate(obj, {
              val: end,
              duration: 1.1,
              ease: "outExpo",
              onUpdate: () => {
                if (format === "xp-k") {
                  el.textContent = formatXpCompactK(Math.round(obj.val));
                  return;
                }
                el.textContent = `${Math.round(obj.val).toLocaleString()}${suffix}`;
              },
            });
          });
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(root);

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [animateValues, immediate, reducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function StudentHubNumericStat({
  watermark,
  icon,
  label,
  numericEnd,
  numericSuffix = "",
  displayValue,
  detail,
  gold,
  variant = "clip",
  compact = false,
  valueFormat = "default",
  className,
}: {
  watermark: string | number;
  icon: VocabIconName;
  label: string;
  numericEnd: number;
  numericSuffix?: string;
  displayValue?: string;
  detail?: string;
  gold?: boolean;
  variant?: LandingStickyVariant;
  compact?: boolean;
  valueFormat?: "default" | "xp-k";
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const staticDisplay =
    displayValue ??
    (valueFormat === "xp-k"
      ? formatXpCompactK(numericEnd)
      : `${numericEnd.toLocaleString()}${numericSuffix}`);

  return (
    <LandingStickyNote
      variant={variant}
      compact={compact}
      className={cn(LP_NUM.card, "relative text-center opacity-0", className)}
    >
      <LandingNumberWatermark value={watermark} />
      <div className="relative mx-auto flex justify-center">
        <MentrixaVocabIcon name={icon} size={compact ? 26 : 32} surface="light" gold={gold} title={label} />
      </div>
      <p
        className={cn(
          LP_NUM_STAT_VALUE_CLASS,
          displayValue && "text-[clamp(0.95rem,2.2vw,1.35rem)] leading-tight tracking-tight",
          compact && !displayValue && "text-[clamp(1.35rem,3vw,1.75rem)]",
        )}
        data-value={displayValue ? undefined : numericEnd}
        data-suffix={displayValue ? undefined : numericSuffix}
        data-format={displayValue ? undefined : valueFormat}
      >
        {displayValue || reducedMotion
          ? staticDisplay
          : valueFormat === "xp-k"
            ? "0K"
            : `0${numericSuffix}`}
      </p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#6366F1]">{label}</p>
      {detail ? <p className="mt-1 text-[11px] leading-snug text-[#475569]">{detail}</p> : null}
    </LandingStickyNote>
  );
}

/** Playfair inline digits inside verdict lines and copy. */
export function StudentHubPlayfairNumbers({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(\d+(?:\/\d+)?%?|÷|×|=)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (/^\d/.test(part) || part === "÷" || part === "×" || part === "=") {
          return (
            <span key={`${part}-${index}`} className={cn(LP_NUM_TITLE_CLASS, "text-[clamp(1.25rem,2.5vw,1.75rem)] opacity-100")}>
              {part}
            </span>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </span>
  );
}

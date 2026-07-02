"use client";

import { cn } from "@/shared/core/utils";
import {
  getVocabIconMeta,
  type VocabIconName,
} from "@/shared/icons/mentrixa-vocab-map";
import { weekdayLabel, weekdayVocabIcon } from "@/shared/icons/weekday-vocab-pure";

const GOLD_VERIFIED = "#D4A017";

export type MentrixaVocabIconProps = {
  name: VocabIconName;
  size?: number;
  className?: string;
  /** Verified-truth styling — only use on allowsGold icons (verified, rank-proof, impact-score, etc.). */
  gold?: boolean;
  /** Override accessible name; defaults to registry label. */
  title?: string;
};

/**
 * Renders a Mentrixa vocabulary sticker SVG from /public/icons/vocab/ or /public/icons/guide-ranks/.
 * Uses CSS mask so stroke-first SVGs inherit `currentColor` from the parent.
 */
export function MentrixaVocabIcon({
  name,
  size = 24,
  className,
  gold = false,
  title,
}: MentrixaVocabIconProps) {
  const meta = getVocabIconMeta(name);
  const ariaLabel = title ?? meta.label;
  const useGold = gold && meta.allowsGold;
  const tint = useGold ? GOLD_VERIFIED : "currentColor";

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "inline-block shrink-0",
        useGold && "rounded-md ring-1 ring-[#D4A017]/50 drop-shadow-[0_0_6px_rgba(212,160,23,0.35)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: tint,
        WebkitMaskImage: `url("${meta.src}")`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: `url("${meta.src}")`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}

export type MentrixaVocabIconLabelProps = MentrixaVocabIconProps & {
  showLabel?: boolean;
  labelClassName?: string;
};

/** Icon with optional text label — default pattern for nav and stat rows. */
export function MentrixaVocabIconLabel({
  showLabel = true,
  labelClassName,
  ...iconProps
}: MentrixaVocabIconLabelProps) {
  const meta = getVocabIconMeta(iconProps.name);

  return (
    <span className="inline-flex items-center gap-2">
      <MentrixaVocabIcon {...iconProps} />
      {showLabel ? (
        <span className={cn("text-sm font-medium leading-none", labelClassName)}>{meta.label}</span>
      ) : null}
    </span>
  );
}

/** Streak flame + count + weekday badge — day icon is always the current weekday. */
export function StreakCountDisplay({
  days,
  size = 20,
  atRisk = false,
  className,
  referenceDate,
}: {
  days: number;
  size?: number;
  atRisk?: boolean;
  className?: string;
  /** Defaults to today in the learner timezone. */
  referenceDate?: Date;
}) {
  const daySize = Math.max(14, Math.round(size * 0.72));
  const flameClass = atRisk ? "text-amber-300" : "text-amber-200";
  const dayClass = atRisk ? "text-amber-200/90" : "text-violet-200/85";
  const when = referenceDate ?? new Date();
  const dayIcon = weekdayVocabIcon(when);
  const dayName = weekdayLabel(when);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`${days} day streak · ${dayName}`}
      title={`${days} day streak · ${dayName}`}
    >
      <MentrixaVocabIcon name="streak" size={size} className={flameClass} title="Streak" />
      <span className="font-mono text-sm font-bold tabular-nums leading-none">{days}</span>
      <MentrixaVocabIcon name={dayIcon} size={daySize} className={dayClass} title={dayName} />
    </span>
  );
}

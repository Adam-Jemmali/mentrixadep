"use client";

import { useState } from "react";
import { cn } from "@/shared/core/utils";
import {
  getVocabIconMeta,
  type VocabIconName,
} from "@/shared/icons/mentrixa-vocab-map";

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

function PlaceholderIcon({
  name,
  size,
  className,
  label,
}: {
  name: VocabIconName;
  size: number;
  className?: string;
  label: string;
}) {
  const abbrev = name
    .split("-")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <span
      role="img"
      aria-label={`${label} (placeholder)`}
      title={`${label} — SVG pending`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-dashed border-slate-400/80 bg-slate-200/90 font-mono font-bold uppercase text-slate-500",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(7, Math.round(size * 0.22)) }}
    >
      {abbrev}
    </span>
  );
}

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
  const [missing, setMissing] = useState(false);
  const ariaLabel = title ?? meta.label;
  const useGold = gold && meta.allowsGold;
  const tint = useGold ? GOLD_VERIFIED : "currentColor";

  if (missing) {
    return (
      <PlaceholderIcon
        name={name}
        size={size}
        className={cn(useGold && "border-amber-400/60 bg-amber-50/90 text-amber-800", className)}
        label={ariaLabel}
      />
    );
  }

  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {/* Hidden probe for missing assets */}
      <img
        src={meta.src}
        alt=""
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        onError={() => setMissing(true)}
      />
      <span
        role="img"
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          "inline-block shrink-0",
          useGold && "rounded-md ring-1 ring-[#D4A017]/50 drop-shadow-[0_0_6px_rgba(212,160,23,0.35)]",
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: tint,
          WebkitMaskImage: `url(${meta.src})`,
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskImage: `url(${meta.src})`,
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
        }}
      />
    </span>
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

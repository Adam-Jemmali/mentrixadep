"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/shared/core/utils";
import {
  getVocabIconMeta,
  vocabIconSrc,
  XP_ICON_SRC,
  VOCAB_SHORT_LABEL,
  type VocabIconName,
} from "@/shared/icons/mentrixa-vocab-map";
import { weekdayLabel, weekdayVocabIcon } from "@/shared/icons/weekday-vocab-pure";

const GOLD_FILTER =
  "brightness(0) saturate(100%) invert(73%) sepia(48%) saturate(746%) hue-rotate(8deg) brightness(95%) contrast(92%)";

function isRasterVocabSrc(src: string): boolean {
  return /\.(webp|png|jpe?g|gif|avif)$/i.test(src);
}

/** Black-stroke SVGs on dark shells: invert so the authored glyph reads white. */
function svgFilter(surface: "dark" | "light", gold: boolean): string | undefined {
  if (gold) return GOLD_FILTER;
  if (surface === "dark") return "invert(1)";
  return undefined;
}

export type MentrixaVocabIconProps = {
  name: VocabIconName;
  size?: number;
  className?: string;
  gold?: boolean;
  title?: string;
  surface?: "dark" | "light";
};

/**
 * Renders vocabulary assets from /public/icons/ or /images/xp.webp.
 * SVGs use a native <img> so the file displays as authored (no mask / background-image).
 */
export function MentrixaVocabIcon({
  name,
  size = 24,
  className,
  gold = false,
  title,
  surface = "dark",
}: MentrixaVocabIconProps) {
  const meta = getVocabIconMeta(name);
  const src = vocabIconSrc(name);
  const ariaLabel = title ?? meta.label;
  const useGold = gold && meta.allowsGold;
  const raster = isRasterVocabSrc(src);

  if (raster) {
    return (
      <span
        className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={ariaLabel}
          title={ariaLabel}
          width={size}
          height={size}
          className="h-full w-full object-contain"
          unoptimized
          draggable={false}
        />
      </span>
    );
  }

  const filter = svgFilter(surface, useGold);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        useGold && "rounded-md ring-1 ring-[#D4A017]/50 drop-shadow-[0_0_6px_rgba(212,160,23,0.35)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={ariaLabel}
        title={ariaLabel}
        width={size}
        height={size}
        className="block h-full w-full object-contain"
        style={filter ? { filter } : undefined}
        draggable={false}
        decoding="async"
      />
    </span>
  );
}

export type MentrixaVocabIconLabelProps = MentrixaVocabIconProps & {
  showLabel?: boolean;
  labelClassName?: string;
};

export function MentrixaVocabIconLabel({
  showLabel = true,
  labelClassName,
  ...iconProps
}: MentrixaVocabIconLabelProps) {
  const meta = getVocabIconMeta(iconProps.name);
  const shortLabel = VOCAB_SHORT_LABEL[iconProps.name] ?? meta.label;

  return (
    <span className="inline-flex items-center gap-2">
      <MentrixaVocabIcon {...iconProps} />
      {showLabel ? (
        <span className={cn("text-sm font-medium leading-none", labelClassName)}>{shortLabel}</span>
      ) : null}
    </span>
  );
}

export function VocabHubTile({
  name,
  href,
  value,
  surface = "dark",
  className,
  iconSize = 40,
}: {
  name: VocabIconName;
  href: string;
  value?: string | number;
  surface?: "dark" | "light";
  className?: string;
  iconSize?: number;
}) {
  const meta = getVocabIconMeta(name);
  const label = VOCAB_SHORT_LABEL[name] ?? meta.label.split(/\s+/)[0] ?? meta.label;

  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-3 transition hover:border-white/30 hover:bg-white/10",
        className,
      )}
      title={meta.label}
    >
      <MentrixaVocabIcon name={name} size={iconSize} surface={surface} title={meta.label} />
      {value != null ? (
        <span className="font-mono text-base font-bold tabular-nums leading-none text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      ) : null}
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">{label}</span>
    </Link>
  );
}

export function StreakCountDisplay({
  days,
  size = 20,
  className,
  referenceDate,
  showLabel = false,
  surface = "dark",
}: {
  days: number;
  size?: number;
  atRisk?: boolean;
  className?: string;
  referenceDate?: Date;
  showLabel?: boolean;
  surface?: "dark" | "light";
}) {
  const daySize = Math.max(14, Math.round(size * 0.72));
  const when = referenceDate ?? new Date();
  const dayIcon = weekdayVocabIcon(when);
  const dayName = weekdayLabel(when);

  return (
    <span
      className={cn("inline-flex flex-col items-center gap-1", className)}
      aria-label={`${days} day streak · ${dayName}`}
      title={`${days} day streak · ${dayName}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <MentrixaVocabIcon name="streak" size={size} surface={surface} title="Streak" />
        <span className="font-mono text-sm font-bold tabular-nums leading-none">{days}</span>
        <MentrixaVocabIcon name={dayIcon} size={daySize} surface={surface} title={dayName} />
      </span>
      {showLabel ? (
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">Streak</span>
      ) : null}
    </span>
  );
}

export function XpCountDisplay({
  xp,
  size = 28,
  showLabel = false,
  className,
}: {
  xp: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col items-center gap-1", className)} title={`${xp.toLocaleString()} XP`}>
      <span className="inline-flex items-center gap-1.5">
        <XpIcon size={size} title="XP" />
        <span className="font-mono text-sm font-bold tabular-nums leading-none text-white">
          {xp.toLocaleString()}
        </span>
      </span>
      {showLabel ? (
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">XP</span>
      ) : null}
    </span>
  );
}

export function XpIcon({ size = 24, title = "XP", className }: { size?: number; title?: string; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      title={title}
    >
      <Image
        src={XP_ICON_SRC}
        alt={title}
        width={size}
        height={size}
        className="h-full w-full object-contain"
        unoptimized
        draggable={false}
      />
    </span>
  );
}

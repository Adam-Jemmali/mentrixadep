"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import {
  getVocabIconMeta,
  VOCAB_SHORT_LABEL,
  type VocabIconName,
} from "@/shared/icons/mentrixa-vocab-map";
import { weekdayLabel, weekdayVocabIcon } from "@/shared/icons/weekday-vocab-pure";

const GOLD_FILTER =
  "brightness(0) saturate(100%) invert(73%) sepia(48%) saturate(746%) hue-rotate(8deg) brightness(95%) contrast(92%)";
const ON_DARK_FILTER = "brightness(0) saturate(100%) invert(1)";
const ON_LIGHT_FILTER = "brightness(0) saturate(100%)";

export type MentrixaVocabIconProps = {
  name: VocabIconName;
  size?: number;
  className?: string;
  /** Verified-truth styling — only use on allowsGold icons (verified, rank-proof, impact-score, etc.). */
  gold?: boolean;
  /** Override accessible name; defaults to registry label. */
  title?: string;
  /** Dark shells tint glyphs white; light shells keep black glyphs. */
  surface?: "dark" | "light";
};

/**
 * Renders a Mentrixa vocabulary sticker SVG from /public/icons/vocab/ or /public/icons/guide-ranks/.
 * Uses <img> + CSS filter so stroke SVGs render reliably (CSS mask + external SVG often shows blank).
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
  const ariaLabel = title ?? meta.label;
  const useGold = gold && meta.allowsGold;
  const filter = useGold
    ? GOLD_FILTER
    : surface === "dark"
      ? ON_DARK_FILTER
      : ON_LIGHT_FILTER;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        useGold && "rounded-md ring-1 ring-[#D4A017]/50 drop-shadow-[0_0_6px_rgba(212,160,23,0.35)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={meta.src}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        style={{ filter }}
        role="img"
        aria-label={ariaLabel}
        title={ariaLabel}
        draggable={false}
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

/** Big hub tile: large icon + optional value + one-word label. */
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

/** Streak flame + count + weekday badge — day icon is always the current weekday. */
export function StreakCountDisplay({
  days,
  size = 20,
  atRisk = false,
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
  const flameClass = atRisk ? "text-amber-300" : "text-amber-200";
  const dayClass = atRisk ? "text-amber-200/90" : "text-violet-200/85";
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
        <MentrixaVocabIcon name="streak" size={size} surface={surface} className={flameClass} title="Streak" />
        <span className="font-mono text-sm font-bold tabular-nums leading-none">{days}</span>
        <MentrixaVocabIcon name={dayIcon} size={daySize} surface={surface} className={dayClass} title={dayName} />
      </span>
      {showLabel ? (
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">Streak</span>
      ) : null}
    </span>
  );
}

/** XP count with vocab arrow icon — use everywhere XP appears on the hub. */
export function XpCountDisplay({
  xp,
  size = 28,
  surface = "dark",
  showLabel = false,
  className,
}: {
  xp: number;
  size?: number;
  surface?: "dark" | "light";
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col items-center gap-1", className)} title={`${xp.toLocaleString()} XP`}>
      <span className="inline-flex items-center gap-1.5">
        <MentrixaVocabIcon name="xp" size={size} surface={surface} title="XP" />
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

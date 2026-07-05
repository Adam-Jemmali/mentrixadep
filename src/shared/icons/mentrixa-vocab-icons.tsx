"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/core/utils";
import {
  getVocabIconMeta,
  isPricingTierIcon,
  vocabIconSrc,
  XP_ICON_SRC,
  VOCAB_SHORT_LABEL,
  type VocabIconName,
} from "@/shared/icons/mentrixa-vocab-map";
import { resolveCanonicalVocabIcon } from "@/shared/icons/vocab-canonical";
import { weekdayLabel, weekdayVocabIcon } from "@/shared/icons/weekday-vocab-pure";
import { renderInlineVocabIcon } from "@/shared/icons/vocab-inline-svgs";
import { PricingTierInlineIcon } from "@/features/pricing/ui/pricing-tier-icons-inline";
import type { PricingTierId } from "@/features/pricing/pricing-tiers-pure";
import {
  hubAccentBackdropClass,
  hubAccentLabelClass,
  hubAccentValueClass,
  type HubAccent,
} from "@/features/student-profile/student-hub-accent";
import { StreakRiskPopup } from "@/features/xp/ui/streak-risk-popup";
import {
  dismissStreakRiskUntil,
  isStreakRiskDismissed,
} from "@/features/xp/streak-risk-pure";

const TIER_VOCAB_TO_ID: Partial<Record<VocabIconName, PricingTierId>> = {
  "tier-arena": "arena",
  "tier-breakthrough": "breakthrough",
  "tier-momentum": "momentum",
};

const GOLD_FILTER =
  "brightness(0) saturate(100%) invert(73%) sepia(48%) saturate(746%) hue-rotate(8deg) brightness(95%) contrast(92%)";

const XP_LIGHT_CHIP =
  "rounded-md bg-[#6366F1] p-0.5 ring-1 ring-[#7C3AED] shadow-sm";

function xpIconChipClass(surface: "dark" | "light", isRasterXp: boolean): string | undefined {
  return surface === "light" && isRasterXp ? XP_LIGHT_CHIP : undefined;
}

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

/** Caps visible icon captions at two words. */
export function vocabTwoWordLabel(text: string): string {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
}

export function VocabStatColumn({
  icon,
  label,
  value,
  gold,
  accent,
  surface = "dark",
  iconSize = 32,
  className,
  valueClassName,
}: {
  icon: VocabIconName;
  label: string;
  value?: string | number;
  gold?: boolean;
  accent?: HubAccent;
  surface?: "dark" | "light";
  iconSize?: number;
  className?: string;
  valueClassName?: string;
}) {
  const caption = vocabTwoWordLabel(label);

  return (
    <div
      className={cn("flex min-w-[4.25rem] flex-col items-center gap-1 text-center", className)}
      aria-label={value != null ? `${value} ${caption}` : caption}
      title={value != null ? `${value} ${caption}` : caption}
    >
      <span className={hubAccentBackdropClass(accent, surface)}>
        <MentrixaVocabIcon name={icon} size={iconSize} gold={gold} surface={surface} title={caption} />
      </span>
      {value != null ? (
        <span
          className={cn(
            "font-mono text-base font-black tabular-nums leading-none sm:text-lg",
            valueClassName ?? hubAccentValueClass(accent, surface),
            gold && "text-[#D4A017]",
          )}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      ) : null}
      <span
        className={cn(
          "max-w-[5.5rem] text-[9px] font-bold uppercase leading-tight tracking-[0.1em]",
          hubAccentLabelClass(accent, surface),
        )}
      >
        {caption}
      </span>
    </div>
  );
}

/**
 * Renders vocabulary assets from /public/icons/.
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
  const canonicalName = resolveCanonicalVocabIcon(name);
  const meta = getVocabIconMeta(canonicalName);
  const src = vocabIconSrc(canonicalName);
  const ariaLabel = title ?? meta.label;
  const useGold = gold === true && meta.allowsGold === true;
  const raster = isRasterVocabSrc(src);
  const tierSticker = isPricingTierIcon(canonicalName);
  const tierId = TIER_VOCAB_TO_ID[canonicalName];
  const inline = tierSticker
    ? null
    : renderInlineVocabIcon(canonicalName, {
        size,
        surface,
        gold: useGold,
        className: "block h-full w-full",
      });

  if (tierId) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: size, height: size }}
        title={ariaLabel}
        aria-label={ariaLabel}
        role="img"
      >
        <PricingTierInlineIcon tier={tierId} size={size} title={ariaLabel} />
      </span>
    );
  }

  if (inline) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          useGold && "rounded-md ring-1 ring-[#D4A017]/50 drop-shadow-[0_0_6px_rgba(212,160,23,0.35)]",
          className,
        )}
        style={{ width: size, height: size }}
        title={ariaLabel}
        aria-label={ariaLabel}
        role="img"
      >
        {inline}
      </span>
    );
  }

  if (raster) {
    const isXpRaster = canonicalName === "xp";
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center",
          xpIconChipClass(surface, isXpRaster),
          className,
        )}
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

  const filter = isPricingTierIcon(canonicalName) ? undefined : svgFilter(surface, useGold);

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

/** Default big icon size for section headings and vocab labels in product UI. */
export const VOCAB_HEADING_ICON_SIZE = 50;

function vocabIconBackdropClass(surface: "dark" | "light"): string {
  return surface === "dark"
    ? "bg-white/12 ring-1 ring-white/20"
    : "bg-indigo-950/6 ring-1 ring-indigo-200/45";
}

function vocabHeadingLabelClass(surface: "dark" | "light", labelClassName?: string): string {
  return cn(
    "text-[10px] font-black uppercase tracking-[0.2em] leading-none",
    surface === "dark" ? "text-violet-100" : "text-zinc-900",
    labelClassName,
  );
}

/** Big contrasting icon + uppercase vocab label for section eyebrows and card titles. */
export function VocabSectionHeading({
  name,
  label,
  surface = "dark",
  gold,
  iconSize = VOCAB_HEADING_ICON_SIZE,
  className,
  labelClassName,
  as: Tag = "p",
}: {
  name: VocabIconName;
  label?: string;
  surface?: "dark" | "light";
  gold?: boolean;
  iconSize?: number;
  className?: string;
  labelClassName?: string;
  as?: "p" | "h1" | "h2" | "h3" | "span" | "div";
}) {
  const meta = getVocabIconMeta(name);
  const text = label ?? VOCAB_SHORT_LABEL[name] ?? meta.label;

  return (
    <Tag className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl p-2",
          vocabIconBackdropClass(surface),
        )}
      >
        <MentrixaVocabIcon name={name} size={iconSize} surface={surface} gold={gold} title={text} />
      </span>
      <span className={vocabHeadingLabelClass(surface, labelClassName)}>{text}</span>
    </Tag>
  );
}

/** Count above icon — minimal stat strip for grid and receipt surfaces. */
export function VocabCountMetric({
  value,
  icon,
  label,
  gold,
  accent,
  surface = "dark",
  iconSize = VOCAB_HEADING_ICON_SIZE,
  valueClassName,
  className,
}: {
  value: number | string;
  icon: VocabIconName;
  label: string;
  gold?: boolean;
  accent?: HubAccent;
  surface?: "dark" | "light";
  iconSize?: number;
  valueClassName?: string;
  className?: string;
}) {
  const caption = vocabTwoWordLabel(label);

  return (
    <span
      className={cn("inline-flex min-w-[2.75rem] flex-col items-center gap-1", className)}
      aria-label={`${value} ${caption}`}
      title={`${value} ${caption}`}
    >
      <span className={hubAccentBackdropClass(accent, surface)}>
        <MentrixaVocabIcon name={icon} size={iconSize} gold={gold} surface={surface} title={caption} />
      </span>
      <span
        className={cn(
          "text-lg font-black tabular-nums leading-none sm:text-xl",
          valueClassName ?? hubAccentValueClass(accent, surface),
          gold && "text-[#D4A017]",
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "max-w-[5.5rem] text-center text-[9px] font-bold uppercase leading-tight tracking-[0.1em]",
          hubAccentLabelClass(accent, surface),
        )}
      >
        {caption}
      </span>
    </span>
  );
}

export function MasteryGridSummaryMetrics({
  verifiedCount,
  proficientCount,
  totalNodes,
  surface = "dark",
  className,
}: {
  verifiedCount: number;
  proficientCount: number;
  totalNodes: number;
  surface?: "dark" | "light";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-4 sm:gap-5", className)}>
      <VocabCountMetric
        value={verifiedCount}
        icon="verified"
        label="Nodes Verified"
        accent="cyan"
        surface={surface}
      />
      <VocabCountMetric
        value={proficientCount}
        icon="practice-pack"
        label="Nodes Proficient"
        accent="indigo"
        surface={surface}
      />
      <VocabCountMetric
        value={totalNodes}
        icon="skills"
        label="Total Skills"
        accent="violet"
        surface={surface}
      />
    </div>
  );
}

export function MentrixaVocabIconLabel({
  showLabel = true,
  labelClassName,
  size = VOCAB_HEADING_ICON_SIZE,
  surface = "dark",
  ...iconProps
}: MentrixaVocabIconLabelProps) {
  const meta = getVocabIconMeta(iconProps.name);
  const shortLabel = VOCAB_SHORT_LABEL[iconProps.name] ?? meta.label;

  return (
    <span className="inline-flex items-center gap-3">
      <span className={cn("flex shrink-0 items-center justify-center rounded-xl p-2", vocabIconBackdropClass(surface))}>
        <MentrixaVocabIcon {...iconProps} size={size} surface={surface} />
      </span>
      {showLabel ? (
        <span className={vocabHeadingLabelClass(surface, labelClassName)}>{shortLabel}</span>
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
  iconSize = VOCAB_HEADING_ICON_SIZE,
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
        "flex min-w-[5rem] flex-col items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-3 transition hover:border-white/30 hover:bg-white/10",
        className,
      )}
      title={meta.label}
      aria-label={meta.label}
    >
      <span className={cn("flex items-center justify-center rounded-xl p-2", vocabIconBackdropClass(surface))}>
        <MentrixaVocabIcon name={name} size={iconSize} surface={surface} title={meta.label} />
      </span>
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
  accent = "violet",
  surface = "dark",
  atRisk = false,
  userId,
  showRiskPopup = false,
}: {
  days: number;
  size?: number;
  atRisk?: boolean;
  className?: string;
  referenceDate?: Date;
  showLabel?: boolean;
  accent?: HubAccent;
  surface?: "dark" | "light";
  /** When set, streak-risk dismiss is persisted for this user. */
  userId?: string;
  /** Show the yellow streak-risk popup anchored to this stat. */
  showRiskPopup?: boolean;
}) {
  const daySize = Math.max(14, Math.round(size * 0.72));
  const when = referenceDate ?? new Date();
  const dayIcon = weekdayVocabIcon(when);
  const dayName = weekdayLabel(when);
  const [riskDismissed, setRiskDismissed] = useState(false);

  useEffect(() => {
    if (!userId || !atRisk || !showRiskPopup) {
      setRiskDismissed(false);
      return;
    }
    setRiskDismissed(isStreakRiskDismissed(userId));
  }, [userId, atRisk, showRiskPopup]);

  const dismissRisk = useCallback(() => {
    if (userId) dismissStreakRiskUntil(userId);
    setRiskDismissed(true);
  }, [userId]);

  const showPopup = showRiskPopup && atRisk && days > 0 && !riskDismissed;

  return (
    <span
      className={cn("relative inline-flex flex-col items-center gap-1", className)}
      aria-label={`${days} day streak · ${dayName}${atRisk ? " · at risk" : ""}`}
      title={`${days} day streak · ${dayName}${atRisk ? " · at risk" : ""}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center",
            atRisk && "rounded-full ring-2 ring-amber-400/80 ring-offset-1 ring-offset-transparent",
          )}
          style={{ width: size, height: size }}
        >
          <MentrixaVocabIcon name="streak" size={size} surface={surface} title="Streak" />
        </span>
        <span className={cn("font-mono text-sm font-bold tabular-nums leading-none", hubAccentValueClass(accent, surface))}>
          {days}
        </span>
        <MentrixaVocabIcon name={dayIcon} size={daySize} surface={surface} title={dayName} />
      </span>
      {showLabel ? (
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.12em]", hubAccentLabelClass(accent, surface))}>
          Streak
        </span>
      ) : null}
      {showPopup ? <StreakRiskPopup inline onDismiss={dismissRisk} /> : null}
    </span>
  );
}

export function XpCountDisplay({
  xp,
  size = 28,
  label = "Your XP",
  showLabel = true,
  accent,
  className,
  surface = "dark",
}: {
  xp: number;
  size?: number;
  label?: string;
  showLabel?: boolean;
  accent?: HubAccent;
  className?: string;
  surface?: "dark" | "light";
}) {
  const caption = vocabTwoWordLabel(label);

  return (
    <span
      className={cn("inline-flex min-w-[4.25rem] flex-col items-center gap-1 text-center", className)}
      title={`${xp.toLocaleString()} ${caption}`}
    >
      <XpIcon size={size} title={caption} surface={surface} />
      <span
        className={cn(
          "font-mono text-base font-black tabular-nums leading-none sm:text-lg",
          hubAccentValueClass(accent, surface),
        )}
      >
        {xp.toLocaleString()}
      </span>
      {showLabel ? (
        <span
          className={cn(
            "text-[9px] font-bold uppercase tracking-[0.1em]",
            hubAccentLabelClass(accent, surface),
          )}
        >
          {caption}
        </span>
      ) : null}
    </span>
  );
}

export function XpIcon({
  size = 24,
  title = "XP",
  className,
  surface = "dark",
}: {
  size?: number;
  title?: string;
  className?: string;
  surface?: "dark" | "light";
}) {
  const raster = isRasterVocabSrc(XP_ICON_SRC);
  const filter = raster ? undefined : svgFilter(surface, false);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        xpIconChipClass(surface, raster),
        className,
      )}
      style={{ width: size, height: size }}
      title={title}
      aria-label={title}
      role="img"
    >
      {raster ? (
        <Image
          src={XP_ICON_SRC}
          alt={title}
          title={title}
          width={size}
          height={size}
          className="h-full w-full object-contain"
          unoptimized
          draggable={false}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={XP_ICON_SRC}
          alt={title}
          width={size}
          height={size}
          className="block h-full w-full object-contain"
          style={filter ? { filter } : undefined}
          draggable={false}
        />
      )}
    </span>
  );
}

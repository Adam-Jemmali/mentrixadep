"use client";

import { type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { EASE_OUT_EXPO } from "@/lib/motion-config";
import { cn } from "@/shared/core/utils";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";

const PAPER_STICKY_SHADOW =
  "shadow-[2px_4px_0_rgba(11,18,32,0.14),4px_10px_22px_-8px_rgba(11,18,32,0.28)]";

export type MentrixaStickyNoteTone = "paper" | "glass";

export type StickyVariant = "verdict" | "grid" | "proof" | "widget" | "compact";
export type StickyColor = "yellow" | "violet" | "green" | "neutral";

export type MentrixaStickyNoteProps = {
  tone?: MentrixaStickyNoteTone;
  variant?: LandingStickyVariant;
  /** Paper: smaller shell without pin/tape/clip decor. Glass: compact padding. */
  compact?: boolean;
  /** Paper only — embedded mini-game shell. */
  game?: boolean;
  /** Glass only */
  color?: StickyColor;
  label?: string;
  animateIn?: boolean;
  index?: number;
  className?: string;
  children: ReactNode;
};

type ColorSpec = {
  surface: CSSProperties;
  tape: string;
  hoverShadow: string;
};

const COLOR_SPECS: Record<StickyColor, ColorSpec> = {
  yellow: {
    surface: {
      background:
        "linear-gradient(145deg, rgba(254, 240, 138, 0.09) 0%, rgba(212, 160, 23, 0.05) 100%)",
      backdropFilter: "blur(12px) saturate(140%)",
      WebkitBackdropFilter: "blur(12px) saturate(140%)",
      border: "1px solid rgba(254, 240, 138, 0.16)",
      boxShadow:
        "inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(212, 160, 23, 0.08)",
    },
    tape: "bg-[rgba(254,240,138,0.22)] border border-[rgba(254,240,138,0.25)] backdrop-blur-[4px]",
    hoverShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,160,23,0.15)",
  },
  violet: {
    surface: {
      background:
        "linear-gradient(145deg, rgba(124, 58, 237, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)",
      backdropFilter: "blur(12px) saturate(140%)",
      WebkitBackdropFilter: "blur(12px) saturate(140%)",
      border: "1px solid rgba(124, 58, 237, 0.16)",
      boxShadow:
        "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(124, 58, 237, 0.10)",
    },
    tape: "bg-[rgba(124,58,237,0.22)] border border-[rgba(124,58,237,0.28)] backdrop-blur-[4px]",
    hoverShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.22)",
  },
  green: {
    surface: {
      background:
        "linear-gradient(145deg, rgba(34, 197, 94, 0.12) 0%, rgba(21, 128, 61, 0.06) 100%)",
      backdropFilter: "blur(12px) saturate(140%)",
      WebkitBackdropFilter: "blur(12px) saturate(140%)",
      border: "1px solid rgba(34, 197, 94, 0.15)",
      boxShadow:
        "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(21, 128, 61, 0.10)",
    },
    tape: "bg-[rgba(34,197,94,0.20)] border border-[rgba(34,197,94,0.26)] backdrop-blur-[4px]",
    hoverShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(34,197,94,0.20)",
  },
  neutral: {
    surface: {
      background:
        "linear-gradient(145deg, rgba(30, 41, 59, 0.72) 0%, rgba(15, 23, 42, 0.58) 100%)",
      backdropFilter: "blur(12px) saturate(130%)",
      WebkitBackdropFilter: "blur(12px) saturate(130%)",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      boxShadow:
        "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 24px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255, 255, 255, 0.04)",
    },
    tape: "bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.12)] backdrop-blur-[4px]",
    hoverShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.10)",
  },
};

const GLASS_VARIANT_PADDING: Record<StickyVariant, string> = {
  verdict: "p-5 sm:p-6",
  grid: "p-4 sm:p-5",
  proof: "p-5",
  widget: "p-4",
  compact: "p-3 sm:p-4",
};

export function mapLandingVariantToGlassVariant(
  variant: LandingStickyVariant,
  compact?: boolean,
): StickyVariant {
  if (compact) return "compact";
  if (variant === "dog-ear") return "widget";
  if (variant === "strip") return "grid";
  return "verdict";
}

export function mapLandingVariantToStudentGlassColor(
  variant: LandingStickyVariant,
  color?: StickyColor,
): StickyColor {
  if (color) return color;
  if (variant === "dog-ear") return "neutral";
  return "yellow";
}

function PaperStickyDecorations({
  variant,
  compact,
}: {
  variant: LandingStickyVariant;
  compact?: boolean;
}) {
  if (compact) return null;
  if (variant === "clip") {
    return (
      <>
        <span className="lp-sticky-note__under" aria-hidden />
        <span className="lp-sticky-clip" aria-hidden>
          <svg viewBox="0 0 24 32" fill="none" className="h-8 w-5" aria-hidden>
            <path
              d="M7 6v18a5 5 0 0 0 10 0V11"
              stroke="#64748B"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </>
    );
  }

  if (variant === "pinned") {
    return <span className="lp-sticky-pin" aria-hidden />;
  }

  if (variant === "taped") {
    return (
      <>
        <span className="lp-sticky-tape lp-sticky-tape--tl" aria-hidden />
        <span className="lp-sticky-tape lp-sticky-tape--tr" aria-hidden />
      </>
    );
  }

  return null;
}

function PaperStickyNote({
  variant = "curl",
  compact = false,
  game = false,
  className,
  children,
}: Pick<MentrixaStickyNoteProps, "variant" | "compact" | "game" | "className" | "children">) {
  return (
    <div
      className={cn(
        mentrixHubSurfaces.stickyNote,
        "mx-surface-light mx-hub-paper lp-sticky-note",
        `lp-sticky-note--${variant}`,
        compact && "lp-sticky-note--compact",
        PAPER_STICKY_SHADOW,
        game
          ? "lp-sticky-game-note lp-sticky-note--game mx-auto w-full max-w-[min(100%,28rem)] overflow-hidden p-3 sm:p-4"
          : "p-5 sm:p-6",
        className,
      )}
    >
      <PaperStickyDecorations variant={variant} compact={compact} />
      {children}
    </div>
  );
}

function GlassStickyNote({
  variant = "curl",
  compact = false,
  color = "yellow",
  label,
  animateIn = false,
  index = 0,
  className,
  children,
}: Pick<
  MentrixaStickyNoteProps,
  "variant" | "compact" | "color" | "label" | "animateIn" | "index" | "className" | "children"
>) {
  const reduce = useReducedMotion();
  const spec = COLOR_SPECS[color];
  const glassVariant = mapLandingVariantToGlassVariant(variant, compact);

  const note = (
    <>
      {label ? (
        <span
          className="pointer-events-none absolute left-3 top-2.5 z-10 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40"
          aria-hidden={label ? undefined : true}
        >
          {label}
        </span>
      ) : null}
      <div className={cn(label && "pt-4")}>{children}</div>
    </>
  );

  const sharedClassName = cn(
    "mx-sticky-note relative overflow-visible rounded-[var(--radius-lg)]",
    "before:pointer-events-none before:absolute before:-top-2 before:left-1/2 before:z-10 before:h-4 before:w-12 before:-translate-x-1/2 before:rounded-sm before:content-['']",
    spec.tape,
    GLASS_VARIANT_PADDING[glassVariant],
    className,
  );

  const sharedStyle: CSSProperties = {
    ...spec.surface,
    borderRadius: "var(--radius-lg)",
  };

  const hoverMotion = reduce
    ? {}
    : {
        whileHover: { y: -3, boxShadow: spec.hoverShadow },
      };

  if (animateIn) {
    return (
      <motion.div
        data-mx-sticky-note
        className={sharedClassName}
        style={sharedStyle}
        initial={
          reduce
            ? false
            : { y: 16, opacity: 0, rotate: index % 2 === 0 ? -0.5 : 0.5 }
        }
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{
          duration: reduce ? 0 : 0.55,
          delay: reduce ? 0 : index * 0.08,
          ease: EASE_OUT_EXPO,
        }}
        {...hoverMotion}
      >
        {note}
      </motion.div>
    );
  }

  return (
    <motion.div
      data-mx-sticky-note
      className={sharedClassName}
      style={sharedStyle}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...hoverMotion}
    >
      {note}
    </motion.div>
  );
}

/** Canonical sticky note — paper on landing, glass on student and Guide hubs. */
export function MentrixaStickyNote({
  tone = "paper",
  variant = "curl",
  compact = false,
  game = false,
  color = "yellow",
  label,
  animateIn = false,
  index = 0,
  className,
  children,
}: MentrixaStickyNoteProps) {
  if (tone === "glass") {
    return (
      <GlassStickyNote
        variant={variant}
        compact={compact}
        color={color}
        label={label}
        animateIn={animateIn}
        index={index}
        className={className}
      >
        {children}
      </GlassStickyNote>
    );
  }

  return (
    <PaperStickyNote variant={variant} compact={compact} game={game} className={className}>
      {children}
    </PaperStickyNote>
  );
}

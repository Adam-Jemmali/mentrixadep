import { cn } from "@/shared/core/utils";
import { MxStickyNote, type StickyColor, type StickyVariant } from "@/components/mx-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";

type StudentStickyNoteProps = {
  variant?: LandingStickyVariant;
  compact?: boolean;
  color?: StickyColor;
  label?: string;
  animateIn?: boolean;
  index?: number;
  className?: string;
  children: React.ReactNode;
};

function mapStickyVariant(variant: LandingStickyVariant, compact?: boolean): StickyVariant {
  if (compact) return "compact";
  if (variant === "dog-ear") return "widget";
  if (variant === "strip") return "grid";
  return "verdict";
}

function mapStickyColor(variant: LandingStickyVariant, color?: StickyColor): StickyColor {
  if (color) return color;
  if (variant === "dog-ear") return "neutral";
  return "yellow";
}

/** Hub glass sticky — Mentrixa signature surface for student surfaces. */
export function StudentStickyNote({
  variant = "curl",
  compact = false,
  color,
  label,
  animateIn,
  index,
  className,
  children,
}: StudentStickyNoteProps) {
  return (
    <MxStickyNote
      variant={mapStickyVariant(variant, compact)}
      color={mapStickyColor(variant, color)}
      label={label}
      animateIn={animateIn}
      index={index}
      className={cn("mx-hub-sticky w-full", className)}
    >
      {children}
    </MxStickyNote>
  );
}

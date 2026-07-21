import { cn } from "@/shared/core/utils";
import { MxStickyNote, type StickyColor, type StickyVariant } from "@/components/mx-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";

type GuideStickyNoteProps = {
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

/** Guide hub glass sticky — violet tint for Guide session surfaces. */
export function GuideStickyNote({
  variant = "curl",
  compact = false,
  color = "violet",
  label,
  animateIn,
  index,
  className,
  children,
}: GuideStickyNoteProps) {
  return (
    <MxStickyNote
      variant={mapStickyVariant(variant, compact)}
      color={color}
      label={label}
      animateIn={animateIn}
      index={index}
      className={cn("mx-hub-sticky h-full w-full", className)}
    >
      {children}
    </MxStickyNote>
  );
}

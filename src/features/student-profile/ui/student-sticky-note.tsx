import { cn } from "@/shared/core/utils";
import {
  MentrixaStickyNote,
  mapLandingVariantToStudentGlassColor,
  type StickyColor,
} from "@/components/mentrixa-sticky-note";
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
    <MentrixaStickyNote
      tone="glass"
      variant={variant}
      compact={compact}
      color={mapLandingVariantToStudentGlassColor(variant, color)}
      label={label}
      animateIn={animateIn}
      index={index}
      className={cn("mx-hub-sticky w-full", className)}
    >
      {children}
    </MentrixaStickyNote>
  );
}

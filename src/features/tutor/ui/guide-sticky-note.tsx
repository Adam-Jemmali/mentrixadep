import { cn } from "@/shared/core/utils";
import { MentrixaStickyNote, type StickyColor } from "@/components/mentrixa-sticky-note";
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
    <MentrixaStickyNote
      tone="glass"
      variant={variant}
      compact={compact}
      color={color}
      label={label}
      animateIn={animateIn}
      index={index}
      className={cn("mx-hub-sticky h-full w-full", className)}
    >
      {children}
    </MentrixaStickyNote>
  );
}

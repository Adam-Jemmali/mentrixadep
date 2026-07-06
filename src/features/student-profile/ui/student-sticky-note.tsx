import { cn } from "@/shared/core/utils";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";

type StudentStickyNoteProps = {
  variant?: LandingStickyVariant;
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Hub paper sticky — same silhouettes as landing (curl, pin, tape, dog-ear, clip, strip). */
export function StudentStickyNote({
  variant = "curl",
  compact = false,
  className,
  children,
}: StudentStickyNoteProps) {
  return (
    <LandingStickyNote variant={variant} compact={compact} className={cn("rotate-0", className)}>
      {children}
    </LandingStickyNote>
  );
}

import { cn } from "@/shared/core/utils";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";

type GuideStickyNoteProps = {
  variant?: LandingStickyVariant;
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Guide hub paper sticky — same silhouettes as student (curl, pin, tape, dog-ear, clip, strip). */
export function GuideStickyNote({
  variant = "curl",
  compact = false,
  className,
  children,
}: GuideStickyNoteProps) {
  return (
    <LandingStickyNote variant={variant} compact={compact} className={cn("rotate-0", className)}>
      {children}
    </LandingStickyNote>
  );
}

import { MentrixaStickyNote } from "@/components/mentrixa-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";

type LandingStickyNoteProps = {
  variant?: LandingStickyVariant;
  /** Compact shell — smaller curl, no pin/tape/clip decor (icon chips). */
  compact?: boolean;
  /** Compact shell for embedded mini-games. */
  game?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function LandingStickyNote({
  variant = "curl",
  compact = false,
  game = false,
  className,
  children,
}: LandingStickyNoteProps) {
  return (
    <MentrixaStickyNote
      tone="paper"
      variant={variant}
      compact={compact}
      game={game}
      className={className}
    >
      {children}
    </MentrixaStickyNote>
  );
}

export function LandingStickyGameNote({
  variant = "curl",
  className,
  children,
}: Omit<LandingStickyNoteProps, "game">) {
  return (
    <LandingStickyNote variant={variant} game className={className}>
      {children}
    </LandingStickyNote>
  );
}

import { cn } from "@/shared/core/utils";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";

const STICKY_SHADOW =
  "shadow-[2px_4px_0_rgba(11,18,32,0.14),4px_10px_22px_-8px_rgba(11,18,32,0.28)]";

type LandingStickyNoteProps = {
  variant?: LandingStickyVariant;
  /** Compact shell — smaller curl, no pin/tape/clip decor (icon chips). */
  compact?: boolean;
  /** Compact shell for embedded mini-games. */
  game?: boolean;
  className?: string;
  children: React.ReactNode;
};

function StickyDecorations({ variant, compact }: { variant: LandingStickyVariant; compact?: boolean }) {
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

export function LandingStickyNote({
  variant = "curl",
  compact = false,
  game = false,
  className,
  children,
}: LandingStickyNoteProps) {
  return (
    <div
      className={cn(
        mentrixHubSurfaces.stickyNote,
        "mx-surface-light mx-hub-paper lp-sticky-note",
        `lp-sticky-note--${variant}`,
        compact && "lp-sticky-note--compact",
        STICKY_SHADOW,
        game
          ? "lp-sticky-game-note lp-sticky-note--game mx-auto w-full max-w-[min(100%,28rem)] overflow-hidden p-3 sm:p-4"
          : "p-5 sm:p-6",
        className,
      )}
    >
      <StickyDecorations variant={variant} compact={compact} />
      {children}
    </div>
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

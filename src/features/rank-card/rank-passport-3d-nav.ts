export type PassportNavContext = {
  coverOpen: boolean;
  coverReady: boolean;
  isFlipping: boolean;
  isAnimating: boolean;
  isClosingCover: boolean;
  spread: number;
  totalSpreads: number;
};

export const PASSPORT_ANIMATION_WATCHDOG_MS = 1500;

/** Cover motion in progress — page turns use a narrower guard so clicks recover after open. */
export function isPassportBusy(
  ctx: Pick<PassportNavContext, "isFlipping" | "isAnimating" | "isClosingCover">,
): boolean {
  return ctx.isFlipping || ctx.isAnimating || ctx.isClosingCover;
}

export function isPassportPageTurnBlocked(
  ctx: Pick<PassportNavContext, "isFlipping" | "isClosingCover">,
): boolean {
  return ctx.isFlipping || ctx.isClosingCover;
}

export function canGoPassportPrev(ctx: PassportNavContext): boolean {
  if (!ctx.coverOpen && !ctx.isClosingCover) return false;
  if (isPassportPageTurnBlocked(ctx)) return false;
  if (ctx.isAnimating) return false;
  return true;
}

export function canGoPassportNext(ctx: PassportNavContext): boolean {
  if (!ctx.coverOpen) {
    return !ctx.isClosingCover && !isPassportPageTurnBlocked(ctx) && !ctx.isAnimating;
  }
  if (!ctx.coverReady || isPassportPageTurnBlocked(ctx)) return false;
  if (ctx.isAnimating && ctx.spread < ctx.totalSpreads - 1) return false;
  return true;
}

/** Spread resets to 0 when the cover fully closes. */
export function spreadAfterCoverClosed(): number {
  return 0;
}

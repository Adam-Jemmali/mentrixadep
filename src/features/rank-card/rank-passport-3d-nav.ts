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

export function isPassportBusy(
  ctx: Pick<PassportNavContext, "isFlipping" | "isAnimating" | "isClosingCover">,
): boolean {
  return ctx.isFlipping || ctx.isAnimating || ctx.isClosingCover;
}

export function canGoPassportPrev(ctx: PassportNavContext): boolean {
  if (!ctx.coverOpen && !ctx.isClosingCover) return false;
  if (ctx.isFlipping) return false;
  if (ctx.isClosingCover) return false;
  if (!ctx.coverReady) return true;
  return !isPassportBusy(ctx);
}

export function canGoPassportNext(ctx: PassportNavContext): boolean {
  if (!ctx.coverOpen) return !ctx.isClosingCover && !ctx.isAnimating;
  if (!ctx.coverReady || isPassportBusy(ctx)) return false;
  return ctx.spread < ctx.totalSpreads - 1;
}

/** Spread resets to 0 when the cover fully closes. */
export function spreadAfterCoverClosed(): number {
  return 0;
}

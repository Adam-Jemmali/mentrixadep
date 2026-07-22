import { describe, expect, it } from "vitest";
import {
  canGoPassportNext,
  canGoPassportPrev,
  isPassportBusy,
  spreadAfterCoverClosed,
  type PassportNavContext,
} from "@/features/rank-card/rank-passport-3d-nav";

function ctx(overrides: Partial<PassportNavContext> = {}): PassportNavContext {
  return {
    coverOpen: false,
    coverReady: false,
    isFlipping: false,
    isAnimating: false,
    isClosingCover: false,
    spread: 0,
    totalSpreads: 3,
    ...overrides,
  };
}

describe("rank-passport-3d-nav", () => {
  it("isPassportBusy when flipping, animating cover, or closing", () => {
    expect(isPassportBusy({ isFlipping: false, isAnimating: false, isClosingCover: false })).toBe(false);
    expect(isPassportBusy({ isFlipping: true, isAnimating: false, isClosingCover: false })).toBe(true);
    expect(isPassportBusy({ isFlipping: false, isAnimating: true, isClosingCover: false })).toBe(true);
    expect(isPassportBusy({ isFlipping: false, isAnimating: false, isClosingCover: true })).toBe(true);
  });

  it("canGoPrev only when cover is open, not busy, and not animating", () => {
    expect(canGoPassportPrev(ctx())).toBe(false);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: false, isAnimating: true }))).toBe(false);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: false }))).toBe(true);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: true, isFlipping: true }))).toBe(false);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: true, isAnimating: true }))).toBe(false);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: true }))).toBe(true);
  });

  it("canGoPrev blocked while cover is closing", () => {
    expect(canGoPassportPrev(ctx({ coverOpen: false, isClosingCover: true, isAnimating: true }))).toBe(false);
  });

  it("canGoNext opens cover when closed and idle", () => {
    expect(canGoPassportNext(ctx())).toBe(true);
  });

  it("canGoNext blocked while cover opening or animating", () => {
    expect(canGoPassportNext(ctx({ coverOpen: true, coverReady: false, isAnimating: true }))).toBe(false);
    expect(canGoPassportNext(ctx({ coverOpen: true, coverReady: false }))).toBe(false);
    expect(canGoPassportNext(ctx({ isAnimating: true }))).toBe(false);
  });

  it("canGoNext blocked while cover opening, closing, or flipping", () => {
    expect(canGoPassportNext(ctx({ coverOpen: false, isClosingCover: true, isAnimating: true }))).toBe(false);
    expect(
      canGoPassportNext(ctx({ coverOpen: true, coverReady: true, isFlipping: true, spread: 0 })),
    ).toBe(false);
  });

  it("canGoNext on last spread closes book", () => {
    expect(canGoPassportNext(ctx({ coverOpen: true, coverReady: true, spread: 2, totalSpreads: 3 }))).toBe(
      true,
    );
    expect(canGoPassportNext(ctx({ coverOpen: true, coverReady: true, spread: 1, totalSpreads: 3 }))).toBe(
      true,
    );
  });

  it("canGoNext blocked on last spread while flipping only", () => {
    expect(
      canGoPassportNext(ctx({ coverOpen: true, coverReady: true, spread: 2, totalSpreads: 3, isFlipping: true })),
    ).toBe(false);
    expect(
      canGoPassportNext(ctx({ coverOpen: true, coverReady: true, spread: 2, totalSpreads: 3, isAnimating: true })),
    ).toBe(true);
  });

  it("canGoNext blocked mid-animation on non-last spreads", () => {
    expect(
      canGoPassportNext(ctx({ coverOpen: true, coverReady: true, spread: 1, totalSpreads: 3, isAnimating: true })),
    ).toBe(false);
  });

  it("canGoPrev blocked mid-flip only", () => {
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: true, isFlipping: true }))).toBe(false);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: true, isAnimating: true }))).toBe(false);
  });

  it("canGoNext blocked mid-flip on any spread", () => {
    expect(
      canGoPassportNext(ctx({ coverOpen: true, coverReady: true, spread: 1, totalSpreads: 3, isFlipping: true })),
    ).toBe(false);
  });

  it("spread resets to 0 after cover closes", () => {
    expect(spreadAfterCoverClosed()).toBe(0);
  });
});

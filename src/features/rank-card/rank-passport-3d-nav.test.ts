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
    spread: 0,
    totalSpreads: 3,
    ...overrides,
  };
}

describe("rank-passport-3d-nav", () => {
  it("isPassportBusy when flipping or animating cover", () => {
    expect(isPassportBusy({ isFlipping: false, isAnimating: false })).toBe(false);
    expect(isPassportBusy({ isFlipping: true, isAnimating: false })).toBe(true);
    expect(isPassportBusy({ isFlipping: false, isAnimating: true })).toBe(true);
  });

  it("canGoPrev only when cover is open and not busy", () => {
    expect(canGoPassportPrev(ctx())).toBe(false);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: false, isAnimating: true }))).toBe(true);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: false }))).toBe(true);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: true, isFlipping: true }))).toBe(false);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: true, isAnimating: true }))).toBe(false);
    expect(canGoPassportPrev(ctx({ coverOpen: true, coverReady: true }))).toBe(true);
  });

  it("canGoNext opens cover when closed", () => {
    expect(canGoPassportNext(ctx())).toBe(true);
  });

  it("canGoNext blocked while cover opening or flipping", () => {
    expect(canGoPassportNext(ctx({ coverOpen: true, coverReady: false }))).toBe(false);
    expect(canGoPassportNext(ctx({ coverOpen: true, coverReady: false, isAnimating: true }))).toBe(false);
    expect(
      canGoPassportNext(ctx({ coverOpen: true, coverReady: true, isFlipping: true, spread: 0 })),
    ).toBe(false);
  });

  it("canGoNext on last spread", () => {
    expect(canGoPassportNext(ctx({ coverOpen: true, coverReady: true, spread: 2, totalSpreads: 3 }))).toBe(
      false,
    );
    expect(canGoPassportNext(ctx({ coverOpen: true, coverReady: true, spread: 1, totalSpreads: 3 }))).toBe(
      true,
    );
  });

  it("spread resets to 0 after cover closes", () => {
    expect(spreadAfterCoverClosed()).toBe(0);
  });
});

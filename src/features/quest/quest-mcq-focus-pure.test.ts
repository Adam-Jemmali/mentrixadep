import { describe, expect, it } from "vitest";
import {
  clampMcqOptionIndex,
  mcqFocusIndexAfterArrow,
  shouldResetMcqFocus,
} from "@/features/quest/quest-mcq-focus-pure";

describe("quest MCQ focus", () => {
  it("clamps focus index to option bounds", () => {
    expect(clampMcqOptionIndex(-1, 4)).toBe(0);
    expect(clampMcqOptionIndex(0, 4)).toBe(0);
    expect(clampMcqOptionIndex(3, 4)).toBe(3);
    expect(clampMcqOptionIndex(9, 4)).toBe(3);
    expect(clampMcqOptionIndex(0, 0)).toBe(0);
  });

  it("advances and retreats with arrow keys without wrapping", () => {
    expect(mcqFocusIndexAfterArrow(1, "ArrowDown", 4)).toBe(2);
    expect(mcqFocusIndexAfterArrow(1, "ArrowRight", 4)).toBe(2);
    expect(mcqFocusIndexAfterArrow(1, "ArrowUp", 4)).toBe(0);
    expect(mcqFocusIndexAfterArrow(1, "ArrowLeft", 4)).toBe(0);
    expect(mcqFocusIndexAfterArrow(3, "ArrowDown", 4)).toBe(3);
    expect(mcqFocusIndexAfterArrow(0, "ArrowUp", 4)).toBe(0);
  });

  it("resets focus only when the question is idle", () => {
    expect(shouldResetMcqFocus(null, false)).toBe(true);
    expect(shouldResetMcqFocus({ correct: true, correctIndex: 0 }, false)).toBe(false);
    expect(shouldResetMcqFocus(null, true)).toBe(false);
  });
});

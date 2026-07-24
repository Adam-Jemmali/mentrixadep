/** Clamp MCQ radiogroup focus index to valid option bounds. */
export function clampMcqOptionIndex(index: number, optionCount: number): number {
  if (optionCount <= 0) return 0;
  return Math.max(0, Math.min(index, optionCount - 1));
}

/** Next focus index after arrow-key navigation in a radiogroup. */
export function mcqFocusIndexAfterArrow(
  current: number,
  key: "ArrowDown" | "ArrowRight" | "ArrowUp" | "ArrowLeft",
  optionCount: number,
): number {
  if (key === "ArrowDown" || key === "ArrowRight") {
    return clampMcqOptionIndex(current + 1, optionCount);
  }
  if (key === "ArrowUp" || key === "ArrowLeft") {
    return clampMcqOptionIndex(current - 1, optionCount);
  }
  return clampMcqOptionIndex(current, optionCount);
}

/** Whether focus should reset to the first option on a new question. */
export function shouldResetMcqFocus(result: unknown, busy: boolean): boolean {
  return result == null && !busy;
}

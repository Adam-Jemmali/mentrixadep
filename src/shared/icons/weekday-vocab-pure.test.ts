import { describe, expect, it } from "vitest";
import { weekdayLabel, weekdayVocabIcon } from "@/shared/icons/weekday-vocab-pure";

describe("weekdayVocabIcon", () => {
  it("maps Wednesday to day-wed", () => {
    const wed = new Date(2026, 6, 1);
    expect(wed.getDay()).toBe(3);
    expect(weekdayVocabIcon(wed)).toBe("day-wed");
    expect(weekdayLabel(wed)).toBe("Wednesday");
  });
});

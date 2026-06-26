import { describe, expect, it } from "vitest";
import { CalendarDate } from "@internationalized/date";
import {
  calendarDateKey,
  datesWithAvailableSlots,
  filterSlotsByCalendarDate,
  firstBookableCalendarDate,
  formatGuideBookingDayVerdict,
  slotIsoDayKey,
} from "@/features/booking/guide-booking-date-pure";

describe("guide booking date pure", () => {
  const tz = "America/New_York";
  const slots = [
    {
      id: "a",
      start_time: "2026-06-25T14:00:00.000Z",
      end_time: "2026-06-25T15:00:00.000Z",
    },
    {
      id: "b",
      start_time: "2026-06-26T14:00:00.000Z",
      end_time: "2026-06-26T15:00:00.000Z",
    },
  ];

  it("maps slot days in tutor timezone", () => {
    const keys = datesWithAvailableSlots(slots, tz);
    expect(keys.size).toBeGreaterThan(0);
    expect(slotIsoDayKey(slots[0]!.start_time, tz)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("filters slots by calendar date", () => {
    const first = firstBookableCalendarDate(slots, tz);
    expect(first).not.toBeNull();
    const filtered = filterSlotsByCalendarDate(slots, first, tz);
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.every((s) => slotIsoDayKey(s.start_time, tz) === calendarDateKey(first!))).toBe(
      true,
    );
  });

  it("formats verdict and next action", () => {
    const date = new CalendarDate(2026, 6, 25);
    expect(formatGuideBookingDayVerdict(2, date).verdict).toContain("2 open slots");
    expect(formatGuideBookingDayVerdict(0, date).nextAction).toContain("another day");
    expect(formatGuideBookingDayVerdict(0, null).verdict).toContain("Pick a session date");
  });
});

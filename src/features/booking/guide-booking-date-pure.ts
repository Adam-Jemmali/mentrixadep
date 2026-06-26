import type { DateValue } from "@internationalized/date";
import { CalendarDate } from "@internationalized/date";

export const GUIDE_BOOKING_WINDOW_DAYS = 14;

export function calendarDateKey(date: DateValue): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function slotIsoDayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function guideBookingWindowBounds(timeZone: string) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = formatter.format(now).split("-").map(Number);
  const min = new CalendarDate(y!, m!, d!);
  const max = min.add({ days: GUIDE_BOOKING_WINDOW_DAYS });
  return { min, max };
}

export function filterSlotsByCalendarDate<T extends { start_time: string }>(
  slots: T[],
  date: DateValue | null,
  timeZone: string,
): T[] {
  if (!date) return slots;
  const key = calendarDateKey(date);
  return slots.filter((slot) => slotIsoDayKey(slot.start_time, timeZone) === key);
}

export function datesWithAvailableSlots<T extends { start_time: string }>(
  slots: T[],
  timeZone: string,
): Set<string> {
  const keys = new Set<string>();
  for (const slot of slots) {
    keys.add(slotIsoDayKey(slot.start_time, timeZone));
  }
  return keys;
}

export function firstBookableCalendarDate<T extends { start_time: string }>(
  slots: T[],
  timeZone: string,
): CalendarDate | null {
  if (slots.length === 0) return null;
  const sorted = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const key = slotIsoDayKey(sorted[0]!.start_time, timeZone);
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new CalendarDate(y, m, d);
}

export function formatGuideBookingDayVerdict(
  slotCount: number,
  date: DateValue | null,
): { verdict: string; nextAction: string } {
  if (!date) {
    return {
      verdict: "Pick a session date to see open Guide slots.",
      nextAction: "Next: choose a highlighted day in the next 14 days.",
    };
  }
  if (slotCount === 0) {
    return {
      verdict: "No open slots on this date.",
      nextAction: "Next: pick another day with availability.",
    };
  }
  return {
    verdict: `${slotCount} open slot${slotCount === 1 ? "" : "s"} on this date.`,
    nextAction: "Next: book a slot to continue to secure checkout.",
  };
}

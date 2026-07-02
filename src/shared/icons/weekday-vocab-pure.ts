import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export const WEEKDAY_VOCAB_ICONS = [
  "day-sun",
  "day-mon",
  "day-tue",
  "day-wed",
  "day-thu",
  "day-fri",
  "day-sat",
] as const satisfies readonly VocabIconName[];

export type WeekdayVocabIconName = (typeof WEEKDAY_VOCAB_ICONS)[number];

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Vocab icon for the weekday of `date` (local timezone). */
export function weekdayVocabIcon(date: Date = new Date()): WeekdayVocabIconName {
  return WEEKDAY_VOCAB_ICONS[date.getDay()]!;
}

export function weekdayLabel(date: Date = new Date()): string {
  return WEEKDAY_LABELS[date.getDay()]!;
}

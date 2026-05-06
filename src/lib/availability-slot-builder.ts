import { addDays } from "date-fns/addDays";
import { formatInTimeZone, toDate } from "date-fns-tz";

/** ISO weekday 1=Mon … 7=Sun → Mon=0 … Sun=6 */
function isoWeekdayToMon0(isoDay: number): number {
  return isoDay - 1;
}

function dayOfWeekMon0InTz(dayUtc: Date, tz: string): number {
  const i = parseInt(formatInTimeZone(dayUtc, tz, "i"), 10);
  if (i < 1 || i > 7) return 0;
  return isoWeekdayToMon0(i);
}

function timeToMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function endUtcForYmd(ymd: string, tz: string, startTime: string, endTime: string): Date {
  const startUtc = toDate(`${ymd}T${startTime}:00`, { timeZone: tz });
  const endUtc = toDate(`${ymd}T${endTime}:00`, { timeZone: tz });
  if (timeToMinutes(endTime) <= timeToMinutes(startTime) || endUtc <= startUtc) {
    throw new Error("End time must be after start time on the same day");
  }
  return endUtc;
}

/**
 * First calendar day in `tz` on or after `fromUtc` matching `weekdayMon0` (Mon=0)
 * where the slot ending at `endTime` that day is still in the future vs `fromUtc`.
 */
export function nextWeekdayYmd(
  fromUtc: Date,
  tz: string,
  weekdayMon0: number,
  startTime: string,
  endTime: string,
): string {
  for (let d = 0; d < 400; d++) {
    const day = addDays(fromUtc, d);
    if (dayOfWeekMon0InTz(day, tz) !== weekdayMon0) continue;
    const ymd = formatInTimeZone(day, tz, "yyyy-MM-dd");
    const endUtc = endUtcForYmd(ymd, tz, startTime, endTime);
    if (endUtc > fromUtc) return ymd;
  }
  throw new Error("Could not find a matching weekday");
}

export type SlotCandidate = {
  startUtc: Date;
  endUtc: Date;
  ymd: string;
};

/**
 * Build UTC instants for each selected weekday × week repeat.
 * `recurringWeeks` = 1 → one occurrence per weekday; >1 → same weekday for that many weeks.
 */
export function buildSlotCandidates(
  nowUtc: Date,
  tz: string,
  weekdaysMon0: number[],
  startTime: string,
  endTime: string,
  recurringWeeks: number,
): SlotCandidate[] {
  const out: SlotCandidate[] = [];
  const seen = new Set<string>();

  for (const wd of weekdaysMon0) {
    const ymd0 = nextWeekdayYmd(nowUtc, tz, wd, startTime, endTime);
    const baseNoon = toDate(`${ymd0}T12:00:00`, { timeZone: tz });

    for (let w = 0; w < recurringWeeks; w++) {
      const dayUtc = addDays(baseNoon, 7 * w);
      const ymd = formatInTimeZone(dayUtc, tz, "yyyy-MM-dd");
      const startUtc = toDate(`${ymd}T${startTime}:00`, { timeZone: tz });
      const endUtc = endUtcForYmd(ymd, tz, startTime, endTime);
      if (endUtc <= nowUtc) continue;

      const key = `${ymd}|${startUtc.toISOString()}|${endUtc.toISOString()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({ startUtc, endUtc, ymd });
    }
  }

  return out.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
}

import { addDays } from "date-fns/addDays";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { isValidIanaTimeZone } from "@/lib/timezones";

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

/**
 * Client/server-shared guard for tutor availability form.
 * Returns a user-facing message when the schedule cannot produce slots, otherwise null.
 */
export function describeAvailabilityScheduleIssue(
  nowUtc: Date,
  tz: string,
  weekdaysMon0: number[],
  startTime: string,
  endTime: string,
  recurringWeeks: number,
  /** Must match user_settings.session_default_duration (Teaching Defaults). */
  requiredSessionMinutes: number,
): string | null {
  if (!isValidIanaTimeZone(tz)) {
    return "Choose a valid timezone from the list.";
  }
  const [sh = NaN, sm = NaN] = startTime.split(":").map(Number);
  const [eh = NaN, em = NaN] = endTime.split(":").map(Number);
  if (![sh, sm, eh, em].every((n) => Number.isFinite(n))) {
    return "Pick valid start and end times.";
  }
  if (sm % 15 !== 0 || em % 15 !== 0) {
    return "Times must use 15-minute steps (:00, :15, :30, :45).";
  }
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) {
    return "End time must be after start time on the same calendar day.";
  }
  const dur = endMin - startMin;
  if (dur !== requiredSessionMinutes) {
    return `Each opening must be exactly ${requiredSessionMinutes} minutes — your Teaching Default (Profile → Teaching Defaults). Pick a start time that fits before midnight, or change your default duration there.`;
  }
  if (dur % 15 !== 0) {
    return "Session length must be a multiple of 15 minutes.";
  }
  if (!weekdaysMon0.length) {
    return "Select at least one weekday.";
  }

  const weeks = Math.min(52, Math.max(1, recurringWeeks));
  try {
    const candidates = buildSlotCandidates(
      nowUtc,
      tz,
      [...weekdaysMon0].sort((a, b) => a - b),
      startTime,
      endTime,
      weeks,
    );
    if (candidates.length === 0) {
      return "No upcoming slots could be created from this schedule. Choose later times or add more weekdays.";
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return msg || "Could not build slots from this schedule.";
  }
  return null;
}

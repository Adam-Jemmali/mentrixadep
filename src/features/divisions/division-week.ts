/**
 * UTC Monday–Sunday weeks. week_start is the ISO date (YYYY-MM-DD) of Monday 00:00 UTC.
 */

export function getUtcWeekMondayDate(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function getUtcWeekMondayString(d = new Date()): string {
  return getUtcWeekMondayDate(d).toISOString().slice(0, 10);
}

/** Monday of the calendar week immediately before the week containing `d`. */
export function getPreviousUtcWeekMondayString(d = new Date()): string {
  const mon = getUtcWeekMondayDate(d);
  mon.setUTCDate(mon.getUTCDate() - 7);
  return mon.toISOString().slice(0, 10);
}

/** Sunday (week end) for the UTC week containing `d`. */
export function getUtcWeekSundayString(d = new Date()): string {
  const mon = getUtcWeekMondayDate(d);
  const sun = new Date(mon);
  sun.setUTCDate(sun.getUTCDate() + 6);
  return sun.toISOString().slice(0, 10);
}

/** Milliseconds until end of UTC day on `isoDate` (YYYY-MM-DD). */
export function msUntilUtcDateEnd(isoDate: string, now = new Date()): number {
  const end = new Date(`${isoDate}T23:59:59.999Z`);
  return Math.max(0, end.getTime() - now.getTime());
}

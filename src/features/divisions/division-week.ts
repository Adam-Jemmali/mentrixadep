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

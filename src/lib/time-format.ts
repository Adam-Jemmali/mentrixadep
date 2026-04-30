/** `YYYY-MM-DDTHH:mm` for `<input type="datetime-local" />` in the user's local timezone */
export function toDatetimeLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Format date and time in a pretty 24-hour format
 * @param date - Date object or ISO string
 * @returns Formatted string like "2024-01-15 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Format time in 24-hour format
 * @param date - Date object or ISO string
 * @returns Formatted string like "14:30"
 */
/** Format clock time in **UTC** (legacy; prefer `formatTimeInZone` for user-facing copy). */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format an instant in a specific IANA timezone (e.g. student profile timezone).
 */
export function formatTimeInZone(date: Date | string, timeZone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(d);
  } catch {
    return formatTime(d);
  }
}

/**
 * Short date (weekday, month, day, year) in a specific timezone — matches booking context.
 */
export function formatDateInZone(date: Date | string, timeZone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone,
    }).format(d);
  } catch {
    return formatDateShort(d);
  }
}

/** e.g. "Mon, Jan 15 · 14:30 – 15:00" in the viewer's timezone */
export function formatSlotRangeInZone(
  startIso: string,
  endIso: string,
  timeZone: string,
): string {
  return `${formatDateInZone(startIso, timeZone)} · ${formatTimeInZone(startIso, timeZone)} – ${formatTimeInZone(endIso, timeZone)}`;
}

/**
 * Format date as YYYY-MM-DD (hydration-safe, same on server and client)
 * @param date - Date object or ISO string
 * @returns Formatted string like "2026-03-17"
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format date in a readable format
 * @param date - Date object or ISO string
 * @returns Formatted string like "Mon, Jan 15, 2024"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format time range in 24-hour format
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted string like "14:30 - 15:00"
 */
export function formatTimeRange(
  startDate: Date | string,
  endDate: Date | string
): string {
  return `${formatTime(startDate)} - ${formatTime(endDate)}`;
}

/** Clock times only, in the given IANA zone (e.g. tutor or student profile). */
export function formatTimeRangeInZone(
  startDate: Date | string,
  endDate: Date | string,
  timeZone: string,
): string {
  return `${formatTimeInZone(startDate, timeZone)} - ${formatTimeInZone(endDate, timeZone)}`;
}

/**
 * Returns a YYYY-MM-DD key for a given instant in a specific timezone.
 * Useful for grouping items by "local day" in a calendar.
 */
export function getDayKeyInZone(date: Date | string, timeZone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "0000-00-00";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Returns the Monday-to-Sunday range for the week containing the given date, in UTC.
 */
export function getWeekRangeUTC(date: Date = new Date()): { startIso: string; endIso: string } {
  const now = new Date(date);
  const day = now.getUTCDay();
  // Monday = 1, Sunday = 0.
  // diff to Monday:
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(now);
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  
  return {
    startIso: monday.toISOString(),
    endIso: sunday.toISOString(),
  };
}

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
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
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


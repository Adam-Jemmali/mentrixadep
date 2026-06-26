export const BADGE_COUNT_CAP = 99;

export function formatBadgeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count > BADGE_COUNT_CAP) return `${BADGE_COUNT_CAP}+`;
  return String(Math.floor(count));
}

export function badgeCountAriaLabel(count: number, noun: string): string {
  const formatted = formatBadgeCount(count);
  if (!formatted) return "";
  return `${formatted} ${noun}${count === 1 ? "" : "s"}`;
}

/** Join UI copy segments without middot separators. */
export function copySegments(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(". ");
}

/** Checkable first-try accuracy line — e.g. 24 ÷ 54 × 100 = 44% */
export function formatFirstTryAccuracyFormula(
  correct: number,
  total: number,
  percent: number,
): string {
  return `${correct} ÷ ${total} × 100 = ${percent}%`;
}

/** Compact XP for hub stats — e.g. 4482 → 4.4K */
export function formatXpCompactK(xp: number): string {
  const safe = Math.max(0, Math.floor(xp));
  if (safe < 1000) return safe.toLocaleString();
  const k = Math.round((safe / 1000) * 10) / 10;
  const text = Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1);
  return `${text}K`;
}

/** Background watermark for XP hub stats — e.g. 4482 → 4k */
export function formatXpWatermarkK(xp: number): string {
  const safe = Math.max(0, Math.floor(xp));
  return `${Math.floor(safe / 1000) || 1}k`;
}

/** Convert attempt accuracy to intervention_retests 0–100 scale. */
export function interventionRetestPostAccuracy(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  if (raw <= 1) return Math.round(raw * 10000) / 100;
  return Math.round(raw * 100) / 100;
}

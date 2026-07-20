/** Max answer latency: 30 minutes. */
export const ANSWERED_MS_MAX = 1_800_000;
export const FASTER_MIN_SAMPLES = 5;
/** Recent median must be ≤ this fraction of prior median. */
export const FASTER_DROP_RATIO = 0.7;

/** Clamp client latency. Null / non-positive / non-finite ignored. */
export function clampAnsweredMs(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(ANSWERED_MS_MAX, Math.round(n));
}

export function medianMs(samples: number[]): number | null {
  const clean = samples
    .map(clampAnsweredMs)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const mid = Math.floor(clean.length / 2);
  if (clean.length % 2 === 1) return clean[mid]!;
  return Math.round((clean[mid - 1]! + clean[mid]!) / 2);
}

/**
 * Faster when prior node samples ≥5 and recent median drops ≥30%.
 * Edge 27: insufficient samples → false.
 */
export function detectFasterVelocity(input: {
  priorMs: number[];
  recentMs: number[];
}): boolean {
  const prior = input.priorMs
    .map(clampAnsweredMs)
    .filter((n): n is number => n != null);
  const recent = input.recentMs
    .map(clampAnsweredMs)
    .filter((n): n is number => n != null);
  if (prior.length < FASTER_MIN_SAMPLES || recent.length === 0) return false;

  const priorMed = medianMs(prior);
  const recentMed = medianMs(recent);
  if (priorMed == null || recentMed == null || priorMed <= 0) return false;

  return recentMed <= priorMed * FASTER_DROP_RATIO;
}

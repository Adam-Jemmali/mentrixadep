export const KEYSTROKE_POOL_SIZE = 20;
export const MAX_MEANINGFUL_FLIGHT_MS = 2000;
export const LOW_VARIANCE_THRESHOLD = 1.5;
export const MIN_KEYSTROKES_FOR_VARIANCE_SIGNAL = 10;
export const TAB_FOCUS_LEAK_THRESHOLD = 3;
export const ANOMALY_FRICTION_THRESHOLD = 0.6;
export const DEFAULT_FRICTION_SCORE = 1.0;

export function computeKeystrokeFlightVariance(flightTimesMs: number[]): number {
  if (flightTimesMs.length < 2) return 0;
  const mean = flightTimesMs.reduce((sum, value) => sum + value, 0) / flightTimesMs.length;
  return (
    flightTimesMs.reduce((sum, value) => sum + (value - mean) ** 2, 0) / flightTimesMs.length
  );
}

export function computeCognitiveFrictionScore(
  tabFocusLeaks: number,
  keystrokeVariance: number,
  keystrokeSampleCount: number
): number {
  let frictionScore = DEFAULT_FRICTION_SCORE;
  if (tabFocusLeaks > TAB_FOCUS_LEAK_THRESHOLD) frictionScore -= 0.2;
  if (
    keystrokeSampleCount >= MIN_KEYSTROKES_FOR_VARIANCE_SIGNAL &&
    keystrokeVariance < LOW_VARIANCE_THRESHOLD
  ) {
    frictionScore -= 0.3;
  }
  return parseFloat(Math.min(1, Math.max(0.1, frictionScore)).toFixed(2));
}

export function isFrictionAnomaly(frictionScore: number): boolean {
  return frictionScore < ANOMALY_FRICTION_THRESHOLD;
}

export function formatSessionFocusSignal(score: number): string {
  const clamped = Math.min(1, Math.max(0.1, score));
  return `Session focus signal: ${clamped.toFixed(1)} of 1.0`;
}

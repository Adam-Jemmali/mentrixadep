export type RetentionMetrics = {
  baseStrength: number;
  hoursElapsed: number;
  biometricFriction: number;
};

export const DEFAULT_COGNITIVE_FRICTION = 1.0;
export const MEMORY_STRENGTH_BASE_START = 24;
export const MEMORY_STRENGTH_GAIN_PER_CORRECT = 12;
export const RETENTION_CRITICAL_THRESHOLD = 0.6;

function clampFriction(friction: number): number {
  return Math.min(1, Math.max(0.1, friction));
}

export function calculateMemoryStrengthBase(correctCountOnNode: number): number {
  const correct = Math.max(0, Math.floor(correctCountOnNode));
  if (correct <= 0) return MEMORY_STRENGTH_BASE_START;
  return MEMORY_STRENGTH_BASE_START + MEMORY_STRENGTH_GAIN_PER_CORRECT * (correct - 1);
}

export function calculateRetention(metrics: RetentionMetrics): number {
  const effectiveFriction = clampFriction(metrics.biometricFriction);
  const effectiveStrength = Math.max(1.0, metrics.baseStrength);
  const retentionDenominator = effectiveStrength * effectiveFriction;
  return parseFloat(
    Math.exp(-metrics.hoursElapsed / retentionDenominator).toFixed(4)
  );
}

export function calculateHoursToTargetReview(baseStrength: number, friction: number): number {
  const effectiveFriction = clampFriction(friction);
  return parseFloat(
    (
      -Math.log(RETENTION_CRITICAL_THRESHOLD) *
      baseStrength *
      effectiveFriction
    ).toFixed(2)
  );
}

export function calculateNextReviewAt(
  baseStrength: number,
  friction: number,
  from = new Date()
): string {
  const hours = calculateHoursToTargetReview(baseStrength, friction);
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}

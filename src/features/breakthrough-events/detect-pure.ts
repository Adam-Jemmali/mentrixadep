import {
  BREAKTHROUGH_MIN_JUMP,
  BREAKTHROUGH_OLD_MAX_AVG,
} from "@/features/breakthrough-events/types";

export function averageAccuracy(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** True when recent performance jumped 25+ pts from an older struggling baseline. */
export function shouldDetectBreakthrough(recentAccuracies: number[], oldAccuracies: number[]): boolean {
  if (recentAccuracies.length < 3 || oldAccuracies.length < 3) return false;
  const recentAvg = averageAccuracy(recentAccuracies);
  const oldAvg = averageAccuracy(oldAccuracies);
  return oldAvg < BREAKTHROUGH_OLD_MAX_AVG && recentAvg - oldAvg >= BREAKTHROUGH_MIN_JUMP;
}

export function buildBreakthroughShareTweet(params: {
  concept: string;
  before: number;
  after: number;
  shareUrl: string;
}): string {
  return `BREAKTHROUGH on Mentrixa: ${params.concept} — ${Math.round(params.before)}% → ${Math.round(params.after)}% | Prove what you know → ${params.shareUrl}`;
}

export function buildBreakthroughSharePath(eventId: string): string {
  return `/breakthrough/${eventId}`;
}

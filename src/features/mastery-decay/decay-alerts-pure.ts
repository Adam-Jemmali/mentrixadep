import type { MasteryNodeState } from "@/features/mastery-grid/types";
import { practiceNodeHref } from "@/features/guidance/verdict-engine-pure";

export const DECAY_ALERT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const DECAY_ALERT_RESEND_MS = 6 * 24 * 60 * 60 * 1000;
export const MS_HOUR = 60 * 60 * 1000;
export const MS_DAY = 24 * 60 * 60 * 1000;

export function isDecayAlertEligibleState(state: MasteryNodeState): boolean {
  return state === "verified" || state === "proficient";
}

export function hoursUntilDecay(nextReviewAt: Date, now: Date): number {
  const ms = nextReviewAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / MS_HOUR));
}

export function daysSinceProof(proofAt: Date, now: Date): number {
  const ms = Math.max(0, now.getTime() - proofAt.getTime());
  return Math.max(1, Math.floor(ms / MS_DAY));
}

export function shouldSendDecayAlert(
  alertSentAt: string | null | undefined,
  now: Date,
): boolean {
  if (!alertSentAt) return true;
  const sent = Date.parse(alertSentAt);
  if (!Number.isFinite(sent)) return true;
  return now.getTime() - sent >= DECAY_ALERT_RESEND_MS;
}

export function isWithinDecayAlertWindow(
  nextReviewAt: Date,
  now: Date,
): boolean {
  const t = nextReviewAt.getTime();
  const n = now.getTime();
  return t > n && t <= n + DECAY_ALERT_WINDOW_MS;
}

export function decayAlertPushCopy(input: {
  nodeName: string;
  daysAgo: number;
  hoursLeft: number;
}): { title: string; body: string } {
  const node = input.nodeName.trim() || "This skill";
  const days = Math.max(1, Math.round(input.daysAgo));
  const hours = Math.max(1, Math.round(input.hoursLeft));
  return {
    title: `${node} is at risk`,
    body: `Verified ${days}d ago. Retest keeps Gold. ${hours}h left.`,
  };
}

export function decayAlertQuestUrl(nodeName: string): string {
  return practiceNodeHref(nodeName.trim() || "this skill");
}

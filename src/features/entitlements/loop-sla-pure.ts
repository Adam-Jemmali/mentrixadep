export const LOOP_SLA_RETEST_WAIT_MS = 7 * 24 * 60 * 60 * 1000;

export type LoopSlaCandidate = {
  retestId: string;
  userId: string;
  sessionId: string;
  skillNodeId: string;
  nodeName: string;
  preAccuracy: number;
  postAccuracy: number;
  completedAt: string;
};

export function loopSlaGrantIdempotencyKey(retestId: string): string {
  return `loop_sla_grant:${retestId}`;
}

/** Failed loop: retest completed and post accuracy did not beat pre accuracy. */
export function isFailedCoachingLoop(preAccuracy: number | null, postAccuracy: number | null): boolean {
  if (preAccuracy == null || postAccuracy == null) return false;
  return postAccuracy <= preAccuracy;
}

/** SLA triggers when retest completed at least 7 days ago. */
export function isLoopSlaEligible(completedAt: string, now: Date = new Date()): boolean {
  const completedMs = new Date(completedAt).getTime();
  if (!Number.isFinite(completedMs)) return false;
  return now.getTime() - completedMs >= LOOP_SLA_RETEST_WAIT_MS;
}

export function buildLoopSlaGrantCopy(input: {
  firstName: string;
  nodeName: string;
}): { subject: string; verdict: string; nextAction: string } {
  return {
    subject: `${input.firstName} — your included session credit was restored`,
    verdict: `Your coaching loop on ${input.nodeName} did not improve within 7 days. Momentum restored your included session credit.`,
    nextAction: "Book your make-good session on the node that still will not move.",
  };
}

export function buildLoopSlaDisclosureMessage(): {
  triggerLabel: string;
  body: string;
  verdict: string;
  nextAction: string;
} {
  return {
    triggerLabel: "Loop SLA guarantee",
    body: "Included session credit restored if loop fails",
    verdict: "Book with credit, retest in 24h, and if verified movement does not improve within 7 days, your credit comes back.",
    nextAction: "Use your included session on your weakest open node.",
  };
}

export function buildLoopSlaReceiptLine(input: { nodeName: string }): string {
  return `Loop SLA: included session credit restored after ${input.nodeName} did not improve within 7 days.`;
}

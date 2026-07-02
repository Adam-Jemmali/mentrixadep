export type BreakthroughMomentumBridgeMessages = {
  verdict: string;
  nextAction: string;
};

export function nextCreditMonthLabel(now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(next);
}

export function buildBreakthroughMomentumBridgeMessages(input: {
  momentumActive: boolean;
  courseName?: string | null;
  now?: Date;
}): BreakthroughMomentumBridgeMessages | null {
  if (input.momentumActive) return null;

  const course = input.courseName?.trim() || "your session";
  const creditDate = nextCreditMonthLabel(input.now);

  return {
    verdict: `Loop opened on ${course}. On Momentum: retest unlocks in 24h not 48h. Your next included session would be $0 on ${creditDate}. Weekly Movement Receipts track whether this node stuck.`,
    nextAction: "Upgrade to Momentum to close the loop every month.",
  };
}

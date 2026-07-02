export type CreditEscalationVariant = "credit_live" | "credit_nudge" | "credit_last_day";

export type CreditEscalationEmailData = {
  variant: CreditEscalationVariant;
  firstName: string;
  creditsRemaining: number;
  periodMonth: string;
  creditExpiryLabel: string;
  weakestNodeName?: string | null;
  openSlotCount?: number | null;
  packSprintLine?: string | null;
};

export function utcLastDayOfMonth(date: Date = new Date()): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

export function resolveCreditEscalationVariant(now: Date = new Date()): CreditEscalationVariant | null {
  const day = now.getUTCDate();
  if (day === 1) return "credit_live";
  if (day === 20) return "credit_nudge";
  if (day === utcLastDayOfMonth(now)) return "credit_last_day";
  return null;
}

/** Weekly cron window: catch month-start, mid-month, and month-end beats in one run. */
export function resolveCreditEscalationVariantForWeeklyRun(now: Date = new Date()): CreditEscalationVariant | null {
  const direct = resolveCreditEscalationVariant(now);
  if (direct) return direct;

  const day = now.getUTCDate();
  const lastDay = utcLastDayOfMonth(now);
  if (day <= 7) return "credit_live";
  if (day >= 18 && day <= 24) return "credit_nudge";
  if (day >= lastDay - 6) return "credit_last_day";
  return null;
}

export function formatCreditExpiryLabel(periodMonth: string): string {
  try {
    const start = new Date(`${periodMonth}T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(end);
  } catch {
    return "end of month";
  }
}

export function buildCreditEscalationCopy(data: CreditEscalationEmailData): {
  subject: string;
  verdict: string;
  nextAction: string;
} {
  const name = data.firstName;
  const sprintSuffix = data.packSprintLine ? ` ${data.packSprintLine}` : "";

  if (data.variant === "credit_live") {
    return {
      subject: `${name} — your included session credit is live`,
      verdict: `Your coaching beat is live. You have ${data.creditsRemaining} included session credit${data.creditsRemaining === 1 ? "" : "s"} for ${data.periodMonth.slice(0, 7)}.${sprintSuffix}`,
      nextAction: data.packSprintLine
        ? "Use sprint credits before they expire, then book your monthly included session."
        : `Book before ${data.creditExpiryLabel} or you lose this month's included session.`,
    };
  }

  if (data.variant === "credit_nudge") {
    const slotLine =
      data.openSlotCount != null && data.openSlotCount > 0
        ? `${Math.min(data.openSlotCount, 99)} open Guide slots match demand right now.`
        : "Open Guide slots are available this week.";
    const weakLine = data.weakestNodeName
      ? `Your weakest node is ${data.weakestNodeName}.`
      : "Book on the node that still will not move.";
    return {
      subject: `${name} — your included session credit is still unused`,
      verdict: `${slotLine} ${weakLine} Your credit expires ${data.creditExpiryLabel}.${sprintSuffix}`,
      nextAction: data.packSprintLine
        ? "Book a sprint session this week, then use your monthly credit before month end."
        : "Book your included session before the month turns or you lose this beat.",
    };
  }

  return {
    subject: `${name} — last day to use your included session credit`,
    verdict: `Today is the last day to use your included session credit for ${data.periodMonth.slice(0, 7)}.${sprintSuffix}`,
    nextAction: data.packSprintLine
      ? "Spend sprint credits first, then your monthly credit before midnight UTC."
      : "Book tonight or lose this month's coaching beat.",
  };
}

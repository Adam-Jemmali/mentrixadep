/** Deterministic weekly truth sentences. No AI. */

export type WeeklyTruthReport = {
  moved: string;
  cause: string;
  stuck: string;
  nextAction: string;
};

export type WeeklyTruthMovedFact = {
  skillNodeId: string;
  nodeName: string;
  fromPercent: number;
  toPercent: number;
} | null;

export type WeeklyTruthCauseFact =
  | { kind: "guide"; guideName: string }
  | { kind: "practice"; sessionCount: number }
  | { kind: "none" };

export type WeeklyTruthStuckFact = {
  nodeName: string;
  attempts: number;
} | null;

export function buildMovedSentence(fact: WeeklyTruthMovedFact): string {
  if (!fact) return "Your accuracy held steady.";
  const from = Math.round(fact.fromPercent);
  const to = Math.round(fact.toPercent);
  return `Your accuracy on ${fact.nodeName} moved from ${from} to ${to} percent this week.`;
}

export function buildCauseSentence(fact: WeeklyTruthCauseFact): string {
  if (fact.kind === "guide") {
    return `This followed a session with ${fact.guideName}.`;
  }
  if (fact.kind === "practice") {
    const n = Math.max(1, fact.sessionCount);
    return `This came from ${n} practice session${n === 1 ? "" : "s"} on that node.`;
  }
  return "Consistent practice drove this.";
}

export function buildStuckSentence(fact: WeeklyTruthStuckFact): string {
  if (!fact) return "No persistent blocks this week.";
  return `${fact.nodeName} resisted improvement despite ${fact.attempts} attempts. Consider a different approach.`;
}

export function buildNextActionSentence(label: string | null | undefined): string {
  const text = label?.trim();
  if (!text) return "Start a verified practice pack.";
  return text;
}

export function assembleWeeklyTruthReport(input: {
  moved: WeeklyTruthMovedFact;
  cause: WeeklyTruthCauseFact;
  stuck: WeeklyTruthStuckFact;
  nextActionLabel: string | null | undefined;
}): WeeklyTruthReport {
  return {
    moved: buildMovedSentence(input.moved),
    cause: buildCauseSentence(input.cause),
    stuck: buildStuckSentence(input.stuck),
    nextAction: buildNextActionSentence(input.nextActionLabel),
  };
}

/** Largest positive accuracy delta vs prior snapshot. */
export function pickLargestPositiveMove(
  rows: Array<{
    skillNodeId: string;
    nodeName: string;
    currentAccuracy: number;
    priorAccuracy: number | null;
  }>,
): WeeklyTruthMovedFact {
  let best: WeeklyTruthMovedFact = null;
  let bestDelta = 0;

  for (const row of rows) {
    if (row.priorAccuracy == null) continue;
    const delta = row.currentAccuracy - row.priorAccuracy;
    if (delta <= 0) continue;
    if (delta > bestDelta) {
      bestDelta = delta;
      best = {
        skillNodeId: row.skillNodeId,
        nodeName: row.nodeName,
        fromPercent: row.priorAccuracy,
        toPercent: row.currentAccuracy,
      };
    }
  }

  return best;
}

/** Most attempts with no improvement vs prior. */
export function pickStuckNode(
  rows: Array<{
    nodeName: string;
    attempts: number;
    currentAccuracy: number;
    priorAccuracy: number | null;
  }>,
  minAttempts = 3,
): WeeklyTruthStuckFact {
  let best: WeeklyTruthStuckFact = null;
  let bestAttempts = 0;

  for (const row of rows) {
    if (row.attempts < minAttempts) continue;
    if (row.priorAccuracy == null) continue;
    if (row.currentAccuracy > row.priorAccuracy) continue;
    if (row.attempts > bestAttempts) {
      bestAttempts = row.attempts;
      best = { nodeName: row.nodeName, attempts: row.attempts };
    }
  }

  return best;
}

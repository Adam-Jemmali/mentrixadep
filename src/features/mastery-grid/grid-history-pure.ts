import type { MasteryNodeState } from "@/features/mastery-grid/types";

export type GridSnapshotWeek = {
  snapshotWeek: string;
  nodeStates: Record<string, MasteryNodeState>;
  verifiedCount: number;
};

export function mondayUtcWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

export function countVerifiedNodes(nodeStates: Record<string, MasteryNodeState>): number {
  return Object.values(nodeStates).filter((state) => state === "verified").length;
}

export function compareGridSnapshots(
  older: Record<string, MasteryNodeState>,
  newer: Record<string, MasteryNodeState>,
): {
  newlyVerified: string[];
  flippedToWeak: string[];
  flippedToProficient: string[];
} {
  const newlyVerified: string[] = [];
  const flippedToWeak: string[] = [];
  const flippedToProficient: string[] = [];

  for (const [nodeId, newState] of Object.entries(newer)) {
    const oldState = older[nodeId] ?? "none";
    if (newState === "verified" && oldState !== "verified") {
      newlyVerified.push(nodeId);
    }
    if (newState === "weak" && oldState !== "weak") {
      flippedToWeak.push(nodeId);
    }
    if (newState === "proficient" && oldState !== "proficient" && oldState !== "verified") {
      flippedToProficient.push(nodeId);
    }
  }

  return { newlyVerified, flippedToWeak, flippedToProficient };
}

export function buildGridHistoryVerdict(input: {
  weeksCompared: number;
  newlyVerifiedCount: number;
  priorNewlyVerifiedCount: number;
}): { verdict: string; nextAction: string } {
  const delta = input.newlyVerifiedCount - input.priorNewlyVerifiedCount;
  const verdict =
    input.newlyVerifiedCount === 0
      ? `No new verified nodes in the last ${input.weeksCompared} weeks compared to the prior period.`
      : delta > 0
        ? `You verified ${input.newlyVerifiedCount} new nodes in the last ${input.weeksCompared} weeks, up from ${input.priorNewlyVerifiedCount} in the prior period.`
        : `You verified ${input.newlyVerifiedCount} new nodes in the last ${input.weeksCompared} weeks.`;

  return {
    verdict,
    nextAction:
      input.newlyVerifiedCount === 0
        ? "Book a Guide session on your weakest node to break the stall."
        : "Keep the streak: take one retest or duel on a weak node this week.",
  };
}

export const GUIDE_MEMORY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type GuideMemoryData = {
  guideId: string;
  guideName: string;
  lastSessionAt: string | null;
  verifiedNodesGained: string[];
  retestsPassed: number;
  retestsFailed: number;
  weakestOpenNode: string | null;
  lastImpactNodeName: string | null;
  lastImpactDelta: number | null;
  verdict: string;
  nextAction: string;
};

export function isGuideMemoryWindowOpen(sessionStartTime: string, now = Date.now()): boolean {
  const start = new Date(sessionStartTime).getTime();
  if (!Number.isFinite(start)) return false;
  return now >= start - GUIDE_MEMORY_WINDOW_MS && now < start;
}

export function buildGuideMemoryBlock(input: {
  guideName: string;
  verifiedNodesGained: string[];
  retestsPassed: number;
  retestsFailed: number;
  weakestOpenNode: string | null;
  lastImpactNodeName: string | null;
  lastImpactDelta: number | null;
}): Pick<GuideMemoryData, "verdict" | "nextAction"> {
  const verifiedLine =
    input.verifiedNodesGained.length > 0
      ? `Verified ${input.verifiedNodesGained.length} new node${input.verifiedNodesGained.length === 1 ? "" : "s"} since your last session with ${input.guideName}.`
      : `No new verified nodes since your last session with ${input.guideName}.`;

  const retestLine =
    input.retestsPassed + input.retestsFailed > 0
      ? ` Retests: ${input.retestsPassed} closed, ${input.retestsFailed} still open.`
      : "";

  const impactLine =
    input.lastImpactNodeName && input.lastImpactDelta != null
      ? ` Last loop on ${input.lastImpactNodeName} moved ${Math.round(input.lastImpactDelta * 100)} points.`
      : "";

  const verdict = `${verifiedLine}${retestLine}${impactLine}`.trim();

  const nextAction = input.weakestOpenNode
    ? `Target ${input.weakestOpenNode} in this call. That node is still your weakest open wall.`
    : "Open with the node that still will not move on first attempt.";

  return { verdict, nextAction };
}

import type { GuestTryQuestion } from "@/features/quest/guest-try-types";

export type ApCalcGuestResultsSummary = {
  scoreLine: string;
  unitLines: string[];
  weakestLine: string;
};

export function isApCalcGuestTryQuestion(q: GuestTryQuestion): boolean {
  return (
    q.kind === "mcq" &&
    typeof q.unitNumber === "number" &&
    typeof q.unitName === "string" &&
    typeof q.nodeName === "string"
  );
}

export function buildApCalcGuestResultsSummary(
  questions: GuestTryQuestion[],
  results: boolean[]
): ApCalcGuestResultsSummary | null {
  if (questions.length === 0 || questions.length !== results.length) return null;
  if (!questions.every(isApCalcGuestTryQuestion)) return null;

  const correct = results.filter(Boolean).length;
  const total = questions.length;

  const unitStats = new Map<
    number,
    { unitName: string; correct: number; total: number }
  >();
  const nodeStats = new Map<
    string,
    {
      unitNumber: number;
      unitName: string;
      nodeName: string;
      correct: number;
      total: number;
    }
  >();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    const unitNumber = q.unitNumber!;
    const unitName = q.unitName!;
    const nodeName = q.nodeName!;
    const ok = results[i] ?? false;

    const unit = unitStats.get(unitNumber) ?? {
      unitName,
      correct: 0,
      total: 0,
    };
    unit.total += 1;
    if (ok) unit.correct += 1;
    unitStats.set(unitNumber, unit);

    const nodeKey = q.skillNodeId ?? `${unitNumber}:${nodeName}`;
    const node = nodeStats.get(nodeKey) ?? {
      unitNumber,
      unitName,
      nodeName,
      correct: 0,
      total: 0,
    };
    node.total += 1;
    if (ok) node.correct += 1;
    nodeStats.set(nodeKey, node);
  }

  const unitLines = [...unitStats.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([unitNumber, stat]) =>
        `Unit ${unitNumber} ${stat.unitName}: ${stat.correct} of ${stat.total} correct`
    );

  let weakest: {
    unitNumber: number;
    unitName: string;
    nodeName: string;
    fraction: number;
  } | null = null;

  for (const stat of nodeStats.values()) {
    const fraction = stat.total > 0 ? stat.correct / stat.total : 0;
    if (
      !weakest ||
      fraction < weakest.fraction ||
      (fraction === weakest.fraction && stat.unitNumber < weakest.unitNumber)
    ) {
      weakest = {
        unitNumber: stat.unitNumber,
        unitName: stat.unitName,
        nodeName: stat.nodeName,
        fraction,
      };
    }
  }

  if (!weakest) return null;

  return {
    scoreLine: `${correct} of ${total} correct`,
    unitLines,
    weakestLine: `Your weakest area: ${weakest.unitName}, ${weakest.nodeName}`,
  };
}

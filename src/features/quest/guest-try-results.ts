import type { GuestTryQuestion } from "@/features/quest/guest-try-types";

export type ApCalcGuestDiagnosticVerdict = {
  weakestNodeName: string;
  weakestUnitNumber?: number;
  weakestUnitName?: string;
  weakestNodeSlug?: string;
  verdictLine1: string;
  verdictLine2: string;
  gapSentence: string;
  /** Raw distractor tag when the miss maps to a known trap. */
  trapInsight?: string;
  stakesSentence: string;
  /** Raw exam_stakes from skill_nodes when present. */
  examStakes?: string;
  scoreFootnote: string;
  allCorrect: boolean;
};

/** @deprecated Legacy shape — use ApCalcGuestDiagnosticVerdict */
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

function formatDistractorTag(tag: string): string {
  const trimmed = tag.trim().replace(/\.$/, "");
  if (!trimmed) return "";
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function resolveDistractorGap(
  wrongOption: string | undefined,
  distractorTags: Record<string, string> | undefined
): { sentence: string; trapInsight?: string } {
  if (!distractorTags || Object.keys(distractorTags).length === 0) {
    return {
      sentence:
        "Your wrong answer matches a common AP Calculus AB misconception on this skill.",
    };
  }

  let trapInsight: string | undefined;

  if (wrongOption) {
    const exact = distractorTags[wrongOption];
    if (exact) {
      trapInsight = exact.trim();
      return {
        sentence: `You likely picked that answer because ${formatDistractorTag(exact)}.`,
        trapInsight,
      };
    }

    const normalized = wrongOption.trim();
    for (const [option, tag] of Object.entries(distractorTags)) {
      if (option.trim() === normalized) {
        trapInsight = tag.trim();
        return {
          sentence: `You likely picked that answer because ${formatDistractorTag(tag)}.`,
          trapInsight,
        };
      }
    }
  }

  const firstTag = Object.values(distractorTags)[0];
  if (firstTag) {
    trapInsight = firstTag.trim();
    return {
      sentence: `A common trap on this skill: ${formatDistractorTag(firstTag)}.`,
      trapInsight,
    };
  }

  return {
    sentence: "Your wrong answer matches a common AP Calculus AB misconception on this skill.",
  };
}

export function buildApCalcGuestDiagnosticVerdict(
  questions: GuestTryQuestion[],
  results: boolean[],
  selectedIndices: number[]
): ApCalcGuestDiagnosticVerdict | null {
  if (questions.length === 0 || questions.length !== results.length) return null;
  if (!questions.every(isApCalcGuestTryQuestion)) return null;

  const correct = results.filter(Boolean).length;
  const total = questions.length;

  const nodeStats = new Map<
    string,
    {
      nodeName: string;
      unitNumber?: number;
      unitName?: string;
      nodeSlug?: string;
      examStakes?: string;
      correct: number;
      total: number;
      wrongEntries: { questionIndex: number }[];
    }
  >();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    const nodeName = q.nodeName!;
    const nodeKey = q.skillNodeId ?? `${q.unitNumber}:${nodeName}`;
    const ok = results[i] ?? false;

    const node = nodeStats.get(nodeKey) ?? {
      nodeName,
      unitNumber: q.unitNumber,
      unitName: q.unitName,
      nodeSlug: undefined,
      examStakes: q.examStakes,
      correct: 0,
      total: 0,
      wrongEntries: [],
    };
    node.total += 1;
    if (ok) {
      node.correct += 1;
    } else {
      node.wrongEntries.push({ questionIndex: i });
    }
    nodeStats.set(nodeKey, node);
  }

  let weakest: {
    nodeName: string;
    unitNumber?: number;
    unitName?: string;
    nodeSlug?: string;
    examStakes?: string;
    fraction: number;
    wrongEntries: { questionIndex: number }[];
  } | null = null;

  for (const stat of nodeStats.values()) {
    const fraction = stat.total > 0 ? stat.correct / stat.total : 0;
    if (
      !weakest ||
      fraction < weakest.fraction ||
      (fraction === weakest.fraction && stat.wrongEntries.length > weakest.wrongEntries.length)
    ) {
      weakest = {
        nodeName: stat.nodeName,
        unitNumber: stat.unitNumber,
        unitName: stat.unitName,
        nodeSlug: stat.nodeSlug,
        examStakes: stat.examStakes,
        fraction,
        wrongEntries: stat.wrongEntries,
      };
    }
  }

  if (!weakest) return null;

  const allCorrect = correct === total;

  let gapSentence =
    "This sample caught a gap before it compounds across the rest of the course.";
  let trapInsight: string | undefined;
  const wrongIndex = weakest.wrongEntries[0]?.questionIndex;
  if (wrongIndex !== undefined) {
    const q = questions[wrongIndex]!;
    const pick = selectedIndices[wrongIndex];
    const wrongOption =
      pick !== undefined && q.options?.[pick] ? q.options[pick] : undefined;
    const gap = resolveDistractorGap(wrongOption, q.distractorTags);
    gapSentence = gap.sentence;
    trapInsight = gap.trapInsight;
  }

  const stakesSentence =
    weakest.examStakes?.trim() ||
    "";
  const examStakes = weakest.examStakes?.trim() || undefined;

  if (allCorrect) {
    return {
      weakestNodeName: weakest.nodeName,
      weakestUnitNumber: weakest.unitNumber,
      weakestUnitName: weakest.unitName,
      weakestNodeSlug: weakest.nodeSlug,
      verdictLine1: "Nothing broke in this five-question sample.",
      verdictLine2: "The full AP Calculus AB tree is wider than one diagnostic.",
      gapSentence:
        "You answered every item correctly here. The ranked arena still tracks your first answer on every skill.",
      stakesSentence,
      examStakes,
      scoreFootnote: `${correct} of ${total} correct on this sample`,
      allCorrect: true,
    };
  }

  return {
    weakestNodeName: weakest.nodeName,
    weakestUnitNumber: weakest.unitNumber,
    weakestUnitName: weakest.unitName,
    weakestNodeSlug: weakest.nodeSlug,
    verdictLine1: `You do not know ${weakest.nodeName}.`,
    verdictLine2: "You think you do. You do not.",
    gapSentence,
    trapInsight,
    stakesSentence,
    examStakes,
    scoreFootnote: `${correct} of ${total} correct on this sample`,
    allCorrect: false,
  };
}

/** @deprecated Use buildApCalcGuestDiagnosticVerdict */
export function buildApCalcGuestResultsSummary(
  questions: GuestTryQuestion[],
  results: boolean[]
): ApCalcGuestResultsSummary | null {
  const verdict = buildApCalcGuestDiagnosticVerdict(questions, results, []);
  if (!verdict) return null;

  const unitStats = new Map<number, { unitName: string; correct: number; total: number }>();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    if (!isApCalcGuestTryQuestion(q)) continue;
    const unitNumber = q.unitNumber!;
    const unitName = q.unitName!;
    const unit = unitStats.get(unitNumber) ?? { unitName, correct: 0, total: 0 };
    unit.total += 1;
    if (results[i]) unit.correct += 1;
    unitStats.set(unitNumber, unit);
  }

  const unitLines = [...unitStats.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([unitNumber, stat]) =>
        `Unit ${unitNumber} ${stat.unitName}: ${stat.correct} of ${stat.total} correct`
    );

  return {
    scoreLine: verdict.scoreFootnote,
    unitLines,
    weakestLine: `Your weakest area: ${verdict.weakestNodeName}`,
  };
}

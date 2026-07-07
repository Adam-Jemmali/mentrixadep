import {
  buildComparisonSentence,
  computeBetterThanPercent,
  type AccuracyBucketRow,
} from "@/features/comparison/comparison-context-pure";
import { formatTrapInsightHeadline } from "@/features/quest/ap-calc-skill-visual-pure";
import type {
  StepTraceCompletion,
  StepTraceProblem,
  StepTraceStep,
  StepTraceStepResult,
} from "@/features/diagnostics/step-trace-types";

export type DiagnosticVerdictInput = {
  problem: StepTraceProblem;
  completion: StepTraceCompletion;
  unitNumber?: number;
  unitName?: string;
  nodeSlug?: string;
  /** Peer accuracy buckets for prompt 007 comparison on a clean trace. */
  peerAccuracyBuckets?: AccuracyBucketRow[];
};

export type DiagnosticStepComparison = {
  stepNumber: number;
  stepPrompt: string;
  misconceptionDescription: string;
  userChoice: string;
  correctChoice: string;
};

export type DiagnosticVerdict = {
  allCorrectFirstTry: boolean;
  nodeName: string;
  skillNodeId?: string;
  unitNumber?: number;
  unitName?: string;
  nodeSlug?: string;
  headline: string;
  subheadline: string;
  breakdownSentence?: string;
  stepComparison?: DiagnosticStepComparison;
  comparisonSentence?: string | null;
  stakesSentence: string;
  examStakes?: string;
  scoreFootnote: string;
  ctaLabel: "Save this and start fixing it";
};

const DEFAULT_STAKES =
  "";

const CTA_LABEL = "Save this and start fixing it" as const;

function resolveNodeName(problem: StepTraceProblem): string {
  return problem.nodeName?.trim() || "this skill";
}

function resolveStakes(problem: StepTraceProblem): { stakesSentence: string; examStakes?: string } {
  const examStakes = problem.examStakes?.trim() || undefined;
  return {
    stakesSentence: examStakes || DEFAULT_STAKES,
    examStakes,
  };
}

function buildScoreFootnote(completion: StepTraceCompletion): string {
  return `${completion.steps_correct_first_try} of ${completion.total_steps} steps correct on first answer`;
}

function findFirstDivergence(
  problem: StepTraceProblem,
  completion: StepTraceCompletion,
): { step: StepTraceStep; result: StepTraceStepResult } | null {
  for (const result of completion.steps) {
    if (result.resolved_correctly) continue;
    const step = problem.stepSequence.find((s) => s.step_number === result.step_number);
    if (step) return { step, result };
  }
  return null;
}

function firstWrongPickIndex(step: StepTraceStep, result: StepTraceStepResult): number | null {
  for (const pick of result.picks) {
    if (pick !== step.correct_option_index) return pick;
  }
  return null;
}

function buildStepComparison(
  step: StepTraceStep,
  result: StepTraceStepResult,
): DiagnosticStepComparison | null {
  const wrongPick = firstWrongPickIndex(step, result);
  const userChoice =
    wrongPick != null ? step.options[wrongPick]?.trim() : result.picks[0] != null
      ? step.options[result.picks[0]!]?.trim()
      : "";
  const correctChoice = step.options[step.correct_option_index]?.trim() ?? "";
  if (!userChoice || !correctChoice) return null;

  const misconception =
    result.misconception_tags[0]?.trim() ||
    "your reasoning followed a common AP Calculus AB trap on this move";

  return {
    stepNumber: step.step_number,
    stepPrompt: step.prompt.trim(),
    misconceptionDescription: formatTrapInsightHeadline(misconception),
    userChoice,
    correctChoice,
  };
}

function resolvePeerComparisonSentence(
  peerAccuracyBuckets: AccuracyBucketRow[] | undefined,
): string | null {
  if (!peerAccuracyBuckets?.length) return null;
  const betterThan = computeBetterThanPercent(100, peerAccuracyBuckets);
  if (betterThan == null) return null;
  return buildComparisonSentence(betterThan, "student");
}

/** Deterministic step-trace verdict for the public try diagnostic results screen. */
export function getDiagnosticVerdict(input: DiagnosticVerdictInput): DiagnosticVerdict | null {
  const { problem, completion } = input;
  if (!problem.stepSequence.length || completion.steps.length !== problem.stepSequence.length) {
    return null;
  }

  const nodeName = resolveNodeName(problem);
  const { stakesSentence, examStakes } = resolveStakes(problem);
  const scoreFootnote = buildScoreFootnote(completion);
  const allCorrectFirstTry =
    completion.steps_correct_first_try === completion.total_steps &&
    completion.steps.every((step) => step.resolved_correctly);

  if (allCorrectFirstTry) {
    return {
      allCorrectFirstTry: true,
      nodeName,
      skillNodeId: problem.skillNodeId,
      unitNumber: input.unitNumber,
      unitName: input.unitName,
      nodeSlug: input.nodeSlug,
      headline: "You solved this the way a strong AP Calculus AB student would.",
      subheadline: `${nodeName} is genuinely solid for you.`,
      comparisonSentence: resolvePeerComparisonSentence(input.peerAccuracyBuckets),
      stakesSentence,
      examStakes,
      scoreFootnote,
      ctaLabel: CTA_LABEL,
    };
  }

  const divergence = findFirstDivergence(problem, completion);
  if (!divergence) return null;

  const stepComparison = buildStepComparison(divergence.step, divergence.result);
  const misconception =
    stepComparison?.misconceptionDescription ||
    "your reasoning followed a common AP Calculus AB trap on this move";

  return {
    allCorrectFirstTry: false,
    nodeName,
    skillNodeId: problem.skillNodeId,
    unitNumber: input.unitNumber,
    unitName: input.unitName,
    nodeSlug: input.nodeSlug,
    headline: `You do not know ${nodeName} the way you think you do.`,
    subheadline: "",
    breakdownSentence: `Your reasoning broke at step ${divergence.step.step_number}: ${misconception}`,
    stepComparison: stepComparison ?? undefined,
    stakesSentence,
    examStakes,
    scoreFootnote,
    ctaLabel: CTA_LABEL,
  };
}

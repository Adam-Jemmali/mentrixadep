/**
 * Gate-based auto-approve for construction formats.
 * No Gemini and no human grading of student answers: every format must ship with
 * an authored, machine-checkable ground truth.
 */

import { expressionParses } from "@/features/free-response/symbolic-grade-pure";
import {
  isConstructionItemFormat,
  parseAuthoringMeta,
  parseClozeBlanks,
  parseDragOrderedItems,
  parseGraphFeatureTargets,
  validateAuthoringDoctrine,
} from "@/features/quest/quest-interaction-formats-pure";
import { parseQuestStimulus } from "@/features/quest/quest-stimulus-pure";
import { parseMultiPartParts, isMultiPartItemFormat } from "@/features/quest/multi-part-pure";

export const CONSTRUCTION_AUTO_APPROVE_REVIEWER = "construction-gates";

export type ConstructionAutoApproveInput = {
  itemFormat: string | null | undefined;
  prompt: string;
  options: unknown;
  correctAnswer: string | null | undefined;
  answerExpression: string | null | undefined;
  solutionSteps: unknown;
  stimulus: unknown;
  authoringMeta: unknown;
  explanation: string | null | undefined;
};

export type ConstructionAutoApproveResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

/**
 * Returns ok only when a Mentrixer answer can be graded with zero human judgment.
 */
export function validateConstructionGroundTruth(
  input: ConstructionAutoApproveInput,
): ConstructionAutoApproveResult {
  const format = String(input.itemFormat ?? "").toLowerCase();
  if (!isConstructionItemFormat(format) && format !== "multi_part") {
    return { ok: false, reasons: ["Not a construction format."] };
  }

  const reasons: string[] = [];
  const prompt = (input.prompt ?? "").trim();
  if (prompt.length < 28) {
    reasons.push("Stem too thin for exceptional bar.");
  }
  if (!(input.explanation ?? "").trim()) {
    reasons.push("Explanation required for post-lock coaching.");
  }

  if (format === "free_response") {
    const expr = (input.answerExpression ?? input.correctAnswer ?? "").trim();
    if (!expr) reasons.push("free_response needs answer_expression ground truth.");
    else if (!expressionParses(expr)) reasons.push("answer_expression does not parse.");
  }

  if (format === "complete_expression") {
    const blanks = parseClozeBlanks(input.solutionSteps);
    if (blanks.length < 1) {
      reasons.push("complete_expression needs ≥1 blank with expression ground truth.");
    }
    for (const blank of blanks) {
      if (!expressionParses(blank.answerExpression)) {
        reasons.push(`Blank ${blank.key} expression does not parse.`);
        break;
      }
    }
  }

  if (format === "drag_order") {
    const items = parseDragOrderedItems(input.options);
    if (items.length < 2) reasons.push("drag_order needs ≥2 ordered items as ground truth.");
    const unique = new Set(items);
    if (unique.size !== items.length) reasons.push("drag_order items must be unique.");
  }

  if (format === "graph_feature") {
    const stimulus = parseQuestStimulus(input.stimulus);
    const hasGraph = stimulus.some((s) => s.kind === "function_graph");
    if (!hasGraph) reasons.push("graph_feature needs function_graph stimulus.");

    const targets = parseGraphFeatureTargets(input.solutionSteps);
    const curveTruth = (input.answerExpression ?? "").trim();
    const hasFeatureTruth = targets.length >= 1;
    const hasSketchTruth = curveTruth.length > 0 && expressionParses(curveTruth);

    if (!hasFeatureTruth && !hasSketchTruth) {
      reasons.push(
        "graph_feature needs feature targets and/or a parseable answer_expression for curve sketch grading.",
      );
    }
    if (curveTruth && !expressionParses(curveTruth)) {
      reasons.push("Sketch answer_expression does not parse.");
    }

    const graph = stimulus.find((s) => s.kind === "function_graph");
    if (graph && graph.kind === "function_graph") {
      const hasDrawable =
        (graph.curves?.length ?? 0) > 0 ||
        (graph.points?.length ?? 0) > 0 ||
        graph.riemann != null;
      if (!hasDrawable && !hasSketchTruth) {
        reasons.push("Function graph stimulus must include a curve, points, or sketch ground truth.");
      }
    }
  }

  if (isMultiPartItemFormat(format) || format === "multi_part") {
    const parts = parseMultiPartParts(input.solutionSteps);
    if (parts.length < 2) reasons.push("multi_part needs ≥2 parts.");
    for (const part of parts) {
      if (part.itemFormat === "free_response") {
        const expr = (part.answerExpression ?? part.correctAnswer ?? "").trim();
        if (!expr || !expressionParses(expr)) {
          reasons.push(`Part ${part.partKey} needs a parseable answer expression.`);
        }
      } else if (part.itemFormat === "mcq") {
        if ((part.options?.length ?? 0) !== 4 || part.correctIndex == null) {
          reasons.push(`Part ${part.partKey} MCQ ground truth incomplete.`);
        }
      }
    }
  }

  // Soft doctrine for auto-approve: if meta present, it must be complete; if absent, allow seed templates.
  const meta = parseAuthoringMeta(input.authoringMeta);
  if (meta) {
    reasons.push(...validateAuthoringDoctrine(meta));
  }

  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true };
}

export function shouldAttemptConstructionAutoApprove(itemFormat: string | null | undefined): boolean {
  const format = String(itemFormat ?? "").toLowerCase();
  return isConstructionItemFormat(format) || format === "multi_part";
}

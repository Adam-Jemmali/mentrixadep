/** Authoring doctrine helpers for item review + offline generators. */

import {
  parseAuthoringMeta,
  validateAuthoringDoctrine,
  type AuthoringDoctrine,
} from "@/features/quest/quest-interaction-formats-pure";
import { detectCurveExpressionFromPrompt } from "@/features/quest/quest-stimulus-pure";

export type StemQualityInput = {
  prompt: string;
  itemFormat: string;
  distractorTags?: Record<string, string> | null;
  stimulus?: unknown;
  authoringMeta?: unknown;
  /** When true, doctrine soft-warn only (Phase 0 gate without blocking all legacy). */
  doctrineRequired?: boolean;
};

export function validateStemQualityForApprove(input: StemQualityInput): string[] {
  const reasons: string[] = [];
  const prompt = input.prompt.trim();
  if (prompt.length < 28) {
    reasons.push("Stem is too thin. Every word must earn its place.");
  }
  if (/find the derivative\.?$/i.test(prompt) && prompt.length < 60) {
    reasons.push("Vague derivative stems fail the exceptional bar. Add constraint, unit, or trap.");
  }

  const curve = detectCurveExpressionFromPrompt(prompt);
  if (curve) {
    const hasStimulus =
      Array.isArray(input.stimulus) &&
      input.stimulus.some((block) => {
        if (!block || typeof block !== "object") return false;
        const kind = String((block as { kind?: string }).kind ?? "").toLowerCase();
        return kind === "function_graph" || kind === "graph";
      });
    if (!hasStimulus) {
      reasons.push("Function stems require a function_graph stimulus with the plotted f(x).");
    }
  }

  if (input.itemFormat === "mcq") {
    const tags = input.distractorTags;
    if (tags != null) {
      const tagCount = Object.keys(tags).length;
      if (tagCount === 1) {
        reasons.push("MCQ needs ≥2 distractor misconception tags.");
      }
    }
  }

  if (input.doctrineRequired) {
    reasons.push(...validateAuthoringDoctrine(parseAuthoringMeta(input.authoringMeta)));
  }

  return reasons;
}

export function defaultAuthoringMetaDraft(skillVerb = "compute"): AuthoringDoctrine {
  return {
    skillVerb,
    transferTag: "AP Calculus AB exam transfer",
    proofArtifact: "First-attempt construction of the target skill under VFA rules.",
    misconceptionKit: [
      "forgot_chain_rule",
      "dropped_constant",
      "swapped_derivative_integral",
    ],
  };
}

import { parseStepTraceSequence } from "../../src/features/diagnostics/step-trace-types";
import { AI_GLOBAL_GUARD } from "./item-bank-auto-verify";

export const SUBJECT = "AP Calculus AB";
export const MIN_APPROVED_PER_NODE = 3;
export const NODE_DELAY_MS = 2000;
export const MAX_QUESTIONS_PER_NODE = 3;

export type SkillNodeRow = {
  id: string;
  node_name: string;
  node_slug: string;
  description: string | null;
  common_misconceptions: string[] | null;
};

export type NodeCoverage = {
  approved: number;
  pending: number;
  has_step_sequence: boolean;
};

export type NodeGenerationPlan = {
  node: SkillNodeRow;
  questions_to_generate: number;
  include_step_sequence: boolean;
};

export function getNodeCoverage(
  nodeId: string,
  items: Array<{ skill_node_id: string; status: string; step_sequence: unknown | null }>,
): NodeCoverage {
  let approved = 0;
  let pending = 0;
  let has_step_sequence = false;

  for (const item of items) {
    if (item.skill_node_id !== nodeId) continue;
    if (item.step_sequence !== null && item.step_sequence !== undefined) {
      has_step_sequence = true;
    }
    if (item.status === "approved") {
      approved += 1;
    } else if (item.status === "pending_review") {
      pending += 1;
    }
  }

  return { approved, pending, has_step_sequence };
}

export function countQuestionsToGenerate(coverage: NodeCoverage): number {
  const remaining = MIN_APPROVED_PER_NODE - coverage.approved - coverage.pending;
  return Math.max(0, Math.min(remaining, MAX_QUESTIONS_PER_NODE));
}

export function planNodeGeneration(
  node: SkillNodeRow,
  coverage: NodeCoverage,
): NodeGenerationPlan | null {
  const questions_to_generate = countQuestionsToGenerate(coverage);
  if (questions_to_generate === 0) return null;

  return {
    node,
    questions_to_generate,
    include_step_sequence: !coverage.has_step_sequence,
  };
}

export function buildNodeGenerationPrompt(plan: NodeGenerationPlan): string {
  const node = plan.node;
  const misconceptions = node.common_misconceptions ?? [];
  const misconceptionLines =
    misconceptions.length > 0
      ? misconceptions.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
      : "None listed. Invent plausible AP Calculus AB misconceptions for each wrong option.";
  const description = node.description?.trim() || "No description provided.";

  const stepTraceBlock = plan.include_step_sequence
    ? `
For the FIRST question only, also include a guest step-trace path in step_sequence:
- 2 to 4 sequential steps that walk a student through solving the same problem
- Each step has: step_number (starting at 1), prompt, options (2 to 4 strings), correct_option_index, misconception_tag_per_wrong_option (map each wrong option text to a short misconception tag)
- Steps must be sequential and exam appropriate
- Other questions omit step_sequence`
    : `
Do not include step_sequence on any question.`;

  return `${AI_GLOBAL_GUARD}

You are authoring offline AP Calculus AB item bank candidates for human review. Nothing you write is student visible until an admin approves it.

Skill node name (exact): ${node.node_name}
Skill node description (exact): ${description}
Known common_misconceptions:
${misconceptionLines}

Write exactly ${plan.questions_to_generate} multiple choice question(s) for this skill node only.

Requirements for every question:
- Exactly 4 answer options as strings
- Exactly one correct option; correct_answer must match one option string exactly
- Each wrong option must reflect exactly one misconception from the list above
- Tag each wrong option in distractor_tags using the wrong option text as the key and the misconception as the value
- Write a 2 to 3 sentence explanation for the correct answer
- Match the rigor and phrasing of real AP Calculus AB exam questions
${stepTraceBlock}

Return ONLY valid JSON:
{
  "questions": [
    {
      "prompt": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "...",
      "explanation": "...",
      "distractor_tags": { "wrong option text": "misconception text" },
      "step_sequence": [
        {
          "step_number": 1,
          "prompt": "...",
          "options": ["...", "..."],
          "correct_option_index": 0,
          "misconception_tag_per_wrong_option": { "wrong option text": "tag" }
        }
      ]
    }
  ]
}`;
}

export function validateGeneratedStepSequence(raw: unknown): boolean {
  return parseStepTraceSequence(raw) !== null;
}

export function stripMarkdownJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

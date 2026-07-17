import { describe, expect, it } from "vitest";
import {
  MIN_APPROVED_PER_NODE,
  buildNodeGenerationPrompt,
  countQuestionsToGenerate,
  getNodeCoverage,
  planNodeGeneration,
  validateGeneratedStepSequence,
  type SkillNodeRow,
} from "./lib/generate-item-candidates-pure";

const node: SkillNodeRow = {
  id: "node-1",
  node_name: "Power rule",
  node_slug: "power-rule",
  description: "Differentiate x^n using the power rule.",
  common_misconceptions: ["Forgets to multiply by the exponent", "Leaves the exponent unchanged"],
};

describe("generate item candidates pure", () => {
  it("plans generation only when approved plus pending are below three", () => {
    expect(
      countQuestionsToGenerate({
        approved: 1,
        pending: 0,
        has_step_sequence: false,
        free_response_count: 0,
      }),
    ).toBe(2);
    expect(
      countQuestionsToGenerate({
        approved: 2,
        pending: 1,
        has_step_sequence: false,
        free_response_count: 1,
      }),
    ).toBe(0);
    expect(
      countQuestionsToGenerate({
        approved: 3,
        pending: 0,
        has_step_sequence: true,
        free_response_count: 1,
      }),
    ).toBe(0);
  });

  it("flags step_sequence first when only one slot remains", () => {
    const plan = planNodeGeneration(node, {
      approved: 2,
      pending: 0,
      has_step_sequence: false,
      free_response_count: 0,
    });

    expect(plan).toEqual({
      node,
      questions_to_generate: 1,
      include_step_sequence: true,
      include_free_response: false,
    });
  });

  it("includes free_response when coverage is missing and slots allow", () => {
    const plan = planNodeGeneration(node, {
      approved: 1,
      pending: 0,
      has_step_sequence: true,
      free_response_count: 0,
    });

    expect(plan?.include_free_response).toBe(true);
    expect(plan?.questions_to_generate).toBe(2);
  });

  it("builds a per-node prompt with exact node fields and misconception guidance", () => {
    const prompt = buildNodeGenerationPrompt({
      node,
      questions_to_generate: 1,
      include_step_sequence: true,
      include_free_response: false,
    });

    expect(prompt).toContain("Skill node name (exact): Power rule");
    expect(prompt).toContain("Differentiate x^n using the power rule.");
    expect(prompt).toContain("Forgets to multiply by the exponent");
    expect(prompt).toContain("Each wrong option must reflect exactly one misconception");
    expect(prompt).toContain("step_sequence");
    expect(prompt).toContain("human review");
  });

  it("detects approved step-trace and free-response coverage from item rows", () => {
    const coverage = getNodeCoverage("node-1", [
      { skill_node_id: "node-1", status: "approved", step_sequence: null, item_format: "mcq" },
      {
        skill_node_id: "node-1",
        status: "approved",
        step_sequence: [{ step_number: 1 }],
        item_format: "mcq",
      },
      {
        skill_node_id: "node-1",
        status: "pending_review",
        step_sequence: null,
        item_format: "free_response",
      },
    ]);

    expect(coverage.approved).toBe(2);
    expect(coverage.pending).toBe(1);
    expect(coverage.has_step_sequence).toBe(true);
    expect(coverage.free_response_count).toBe(1);
    expect(MIN_APPROVED_PER_NODE).toBe(3);
  });

  it("validates step_sequence shape", () => {
    expect(
      validateGeneratedStepSequence([
        {
          step_number: 1,
          prompt: "First move?",
          options: ["A", "B"],
          correct_option_index: 0,
          misconception_tag_per_wrong_option: { B: "slip" },
        },
        {
          step_number: 2,
          prompt: "Second move?",
          options: ["C", "D"],
          correct_option_index: 1,
          misconception_tag_per_wrong_option: { C: "slip" },
        },
      ]),
    ).toBe(true);
    expect(validateGeneratedStepSequence([{ step_number: 2 }])).toBe(false);
  });
});

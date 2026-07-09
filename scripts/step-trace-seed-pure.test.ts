import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assignStepTraceSeeds,
  assertSeedNodesInUnits,
  loadStepTraceSeedEntries,
  MIN_STEP_TRACE_SEED_COUNT,
} from "./lib/step-trace-seed-pure";

const validSequence = [
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
];

describe("step trace seed pure", () => {
  it("requires at least fifteen valid seed entries", () => {
    const entries = Array.from({ length: MIN_STEP_TRACE_SEED_COUNT }, (_, index) => ({
      seed_id: `seed-${index}`,
      node_slug: `node-${index}`,
      prompt: `Prompt ${index}`,
      step_sequence: validSequence,
    }));

    expect(loadStepTraceSeedEntries(entries)).toHaveLength(MIN_STEP_TRACE_SEED_COUNT);
    expect(() => loadStepTraceSeedEntries(entries.slice(0, 5))).toThrow(/at least 15/);
  });

  it("assigns one approved item per seed without reusing rows", () => {
    const entries = [
      {
        seed_id: "a",
        node_slug: "power-rule",
        prompt: "P1",
        step_sequence: validSequence,
      },
      {
        seed_id: "b",
        node_slug: "power-rule",
        prompt: "P2",
        step_sequence: validSequence,
      },
    ];

    const nodesBySlug = new Map([
      ["power-rule", { id: "node-1", node_slug: "power-rule", unit_number: 2 }],
    ]);

    const { assignments } = assignStepTraceSeeds(
      entries,
      nodesBySlug,
      [
        { id: "item-1", skill_node_id: "node-1", step_sequence: null },
        { id: "item-2", skill_node_id: "node-1", step_sequence: null },
      ],
      false,
    );

    expect(assignments).toHaveLength(2);
    expect(new Set(assignments.map((row) => row.item_id)).size).toBe(2);
  });

  it("rejects seed nodes outside units one through three", () => {
    const entries = [
      {
        seed_id: "late-unit",
        node_slug: "volume-by-disk-method",
        prompt: "Prompt",
        step_sequence: validSequence,
      },
    ];

    const nodesBySlug = new Map([
      ["volume-by-disk-method", { id: "node-8", node_slug: "volume-by-disk-method", unit_number: 8 }],
    ]);

    expect(() => assertSeedNodesInUnits(entries, nodesBySlug)).toThrow(/units 1-3/);
  });

  it("loads the production seed file with fifteen reviewed entries", () => {
    const path = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "data/ap-calc-ab-step-trace-sequences.json",
    );
    expect(existsSync(path)).toBe(true);
    const entries = loadStepTraceSeedEntries(JSON.parse(readFileSync(path, "utf8")));
    expect(entries).toHaveLength(MIN_STEP_TRACE_SEED_COUNT);
  });
});

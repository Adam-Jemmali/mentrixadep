import { describe, expect, it } from "vitest";
import {
  MIN_APPROVED_PER_NODE,
  MIN_STEP_TRACE_UNITS_1_3,
  buildNodeStatusRows,
  formatStatusTable,
  summarizeCoverage,
  type ItemBankInput,
  type SkillNodeInput,
} from "./lib/item-bank-status-pure";

const nodes: SkillNodeInput[] = [
  {
    id: "node-a",
    node_name: "Limits from graphs",
    unit_name: "Limits and Continuity",
    unit_number: 1,
  },
  {
    id: "node-b",
    node_name: "Derivative rules",
    unit_name: "Differentiation Definition and Properties",
    unit_number: 2,
  },
];

function item(
  skill_node_id: string,
  status: ItemBankInput["status"],
  step_sequence: unknown | null = null,
): ItemBankInput {
  return { skill_node_id, status, step_sequence };
}

describe("item bank status pure", () => {
  it("aggregates per-node counts and step-trace availability", () => {
    const rows = buildNodeStatusRows(nodes, [
      item("node-a", "approved"),
      item("node-a", "approved"),
      item("node-a", "pending_review"),
      item("node-a", "rejected"),
      item("node-a", "approved", [{ step: 1 }]),
      item("node-b", "approved"),
    ]);

    expect(rows).toEqual([
      {
        node_name: "Limits from graphs",
        unit_name: "Limits and Continuity",
        approved_count: 3,
        pending_count: 1,
        rejected_count: 1,
        has_step_sequence: true,
        needs_content: false,
        missing_step_trace: false,
      },
      {
        node_name: "Derivative rules",
        unit_name: "Differentiation Definition and Properties",
        approved_count: 1,
        pending_count: 0,
        rejected_count: 0,
        has_step_sequence: false,
        needs_content: true,
        missing_step_trace: true,
      },
    ]);
  });

  it("flags nodes below the approved minimum", () => {
    const rows = buildNodeStatusRows(nodes, [
      item("node-a", "approved"),
      item("node-a", "approved"),
    ]);

    expect(rows[0]?.needs_content).toBe(true);
    expect(rows[0]?.approved_count).toBe(2);
    expect(rows[0]?.approved_count).toBeLessThan(MIN_APPROVED_PER_NODE);
  });

  it("summarizes Units 1-3 step-trace pool size", () => {
    const summary = summarizeCoverage(nodes, [
      item("node-a", "approved", [{ step: 1 }]),
      item("node-b", "approved", [{ step: 1 }]),
    ]);

    expect(summary.step_trace_units_1_3).toBe(2);
    expect(summary.passes_step_trace_pool).toBe(
      summary.step_trace_units_1_3 >= MIN_STEP_TRACE_UNITS_1_3,
    );
    expect(summary.nodes_below_min).toBe(2);
    expect(summary.nodes_missing_step_trace).toBe(0);
  });

  it("counts nodes without any approved step-trace items", () => {
    const summary = summarizeCoverage(nodes, [
      item("node-a", "approved", [{ step: 1 }]),
      item("node-b", "approved"),
    ]);

    expect(summary.nodes_missing_step_trace).toBe(1);
  });

  it("renders a table with flag markers", () => {
    const rows = buildNodeStatusRows(nodes, [item("node-b", "approved")]);
    const table = formatStatusTable(rows, false);

    expect(table).toContain("node_name");
    expect(table).toContain("Derivative rules");
    expect(table).toContain("NEED_CONTENT");
    expect(table).toContain("NO_STEP_TRACE");
  });
});

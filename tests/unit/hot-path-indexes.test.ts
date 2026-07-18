import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("hot-path index audit artifacts", () => {
  it("ships decay + item_bank indexes for 10k+ row tables", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/173-hot-path-indexes.sql"),
      "utf8",
    );
    expect(migration).toContain("idx_skn_decay_check");
    expect(migration).toContain("student_knowledge_nodes (next_review_at)");
    expect(migration).toContain("idx_item_bank_approved_node_format");
    expect(migration).toContain("skill_node_id, item_format");
  });

  it("ships EXPLAIN ANALYZE script for all six hot queries", () => {
    const audit = readFileSync(
      join(process.cwd(), "scripts/index-audit-hot-queries.sql"),
      "utf8",
    );
    expect(audit).toContain("item_bank");
    expect(audit).toContain("live_board_events");
    expect(audit).toContain("student_knowledge_nodes");
    expect(audit).toContain("guide_teaching_portfolio");
    expect(audit).toContain("node_percentile_snapshot");
    expect(audit).toContain("student_goals");
    expect(audit).toMatch(/EXPLAIN \(ANALYZE/g);
  });

  it("ships k6 arena + symbolic scripts for workflow_dispatch", () => {
    expect(existsSync(join(process.cwd(), "load-tests/arena-board.js"))).toBe(true);
    expect(existsSync(join(process.cwd(), "load-tests/symbolic-grader.js"))).toBe(true);
    expect(existsSync(join(process.cwd(), "load-tests/profiles.js"))).toBe(true);
    const ci = readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("load-tests/arena-board.js");
    expect(ci).toContain("load-tests/symbolic-grader.js");
    expect(ci).toContain("PROFILE=smoke");
  });
});

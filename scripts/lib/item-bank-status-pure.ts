export const SUBJECT = "AP Calculus AB";
export const MIN_APPROVED_PER_NODE = 3;
export const MIN_GLOBAL_APPROVED = 300;
export const MAX_GLOBAL_APPROVED = 500;
export const MIN_STEP_TRACE_UNITS_1_3 = 15;

export type SkillNodeInput = {
  id: string;
  node_name: string;
  unit_name: string;
  unit_number: number;
};

export type ItemBankInput = {
  skill_node_id: string;
  status: string;
  step_sequence: unknown | null;
};

export type NodeStatusRow = {
  node_name: string;
  unit_name: string;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  has_step_sequence: boolean;
  needs_content: boolean;
  missing_step_trace: boolean;
};

export type CoverageSummary = {
  approved_total: number;
  pending_total: number;
  rejected_total: number;
  nodes_below_min: number;
  nodes_missing_step_trace: number;
  step_trace_units_1_3: number;
  passes_global: boolean;
  passes_per_node: boolean;
  passes_step_trace_pool: boolean;
};

function hasStepSequenceValue(value: unknown): boolean {
  return value !== null && value !== undefined;
}

export function buildNodeStatusRows(
  nodes: SkillNodeInput[],
  items: ItemBankInput[],
): NodeStatusRow[] {
  const counts = new Map<
    string,
    { approved: number; pending: number; rejected: number; stepTrace: number }
  >();

  for (const item of items) {
    const bucket = counts.get(item.skill_node_id) ?? {
      approved: 0,
      pending: 0,
      rejected: 0,
      stepTrace: 0,
    };

    if (item.status === "approved") {
      bucket.approved += 1;
      if (hasStepSequenceValue(item.step_sequence)) bucket.stepTrace += 1;
    } else if (item.status === "pending_review") {
      bucket.pending += 1;
    } else if (item.status === "rejected") {
      bucket.rejected += 1;
    }

    counts.set(item.skill_node_id, bucket);
  }

  return nodes.map((node) => {
    const bucket = counts.get(node.id) ?? {
      approved: 0,
      pending: 0,
      rejected: 0,
      stepTrace: 0,
    };
    const has_step_sequence = bucket.stepTrace > 0;

    return {
      node_name: node.node_name,
      unit_name: node.unit_name,
      approved_count: bucket.approved,
      pending_count: bucket.pending,
      rejected_count: bucket.rejected,
      has_step_sequence,
      needs_content: bucket.approved < MIN_APPROVED_PER_NODE,
      missing_step_trace: !has_step_sequence,
    };
  });
}

export function summarizeCoverage(
  nodes: SkillNodeInput[],
  items: ItemBankInput[],
): CoverageSummary {
  const rows = buildNodeStatusRows(nodes, items);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  let approved_total = 0;
  let pending_total = 0;
  let rejected_total = 0;
  let step_trace_units_1_3 = 0;

  for (const item of items) {
    if (item.status === "approved") {
      approved_total += 1;
      const node = nodeById.get(item.skill_node_id);
      if (
        node &&
        node.unit_number >= 1 &&
        node.unit_number <= 3 &&
        hasStepSequenceValue(item.step_sequence)
      ) {
        step_trace_units_1_3 += 1;
      }
    } else if (item.status === "pending_review") {
      pending_total += 1;
    } else if (item.status === "rejected") {
      rejected_total += 1;
    }
  }

  const nodes_below_min = rows.filter((row) => row.needs_content).length;
  const nodes_missing_step_trace = rows.filter((row) => row.missing_step_trace).length;

  return {
    approved_total,
    pending_total,
    rejected_total,
    nodes_below_min,
    nodes_missing_step_trace,
    step_trace_units_1_3,
    passes_global:
      approved_total >= MIN_GLOBAL_APPROVED && approved_total <= MAX_GLOBAL_APPROVED,
    passes_per_node: nodes_below_min === 0,
    passes_step_trace_pool: step_trace_units_1_3 >= MIN_STEP_TRACE_UNITS_1_3,
  };
}

function pad(value: string, width: number): string {
  if (value.length >= width) return value.slice(0, width);
  return value.padEnd(width, " ");
}

function flagText(row: NodeStatusRow): string {
  const flags: string[] = [];
  if (row.needs_content) flags.push("NEED_CONTENT");
  if (row.missing_step_trace) flags.push("NO_STEP_TRACE");
  return flags.join(" ");
}

export function formatStatusTable(rows: NodeStatusRow[], useColor: boolean): string {
  const headers = [
    "node_name",
    "unit_name",
    "approved",
    "pending",
    "rejected",
    "step_seq",
    "flags",
  ];
  const widths = [42, 44, 9, 8, 9, 9, 28];
  const yellow = useColor ? "\x1b[33m" : "";
  const magenta = useColor ? "\x1b[35m" : "";
  const reset = useColor ? "\x1b[0m" : "";

  const lines: string[] = [];
  lines.push(headers.map((header, index) => pad(header, widths[index]!)).join("  "));

  for (const row of rows) {
    const values = [
      row.node_name,
      row.unit_name,
      String(row.approved_count),
      String(row.pending_count),
      String(row.rejected_count),
      row.has_step_sequence ? "yes" : "no",
      flagText(row),
    ];

    let line = values.map((value, index) => pad(value, widths[index]!)).join("  ");
    if (row.needs_content && row.missing_step_trace) {
      line = `${yellow}${magenta}${line}${reset}`;
    } else if (row.needs_content) {
      line = `${yellow}${line}${reset}`;
    } else if (row.missing_step_trace) {
      line = `${magenta}${line}${reset}`;
    }
    lines.push(line);
  }

  return lines.join("\n");
}

export function formatCoverageVerdict(summary: CoverageSummary): string {
  const gaps: string[] = [];
  if (!summary.passes_global) {
    gaps.push(
      `approved total ${summary.approved_total} outside ${MIN_GLOBAL_APPROVED}-${MAX_GLOBAL_APPROVED}`,
    );
  }
  if (!summary.passes_per_node) {
    gaps.push(`${summary.nodes_below_min} nodes below ${MIN_APPROVED_PER_NODE} approved`);
  }
  if (!summary.passes_step_trace_pool) {
    gaps.push(
      `Units 1-3 step-trace pool ${summary.step_trace_units_1_3}/${MIN_STEP_TRACE_UNITS_1_3}`,
    );
  }

  if (gaps.length === 0) {
    return "Verdict: item bank coverage meets weekly targets. Next action: run this check again next week.";
  }

  return `Verdict: item bank has coverage gaps (${gaps.join("; ")}). Next action: run npm run item-bank:generate and seed step_sequence rows for flagged nodes.`;
}

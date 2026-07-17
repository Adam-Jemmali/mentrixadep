/** Pure parsers for quest stimulus blocks (tables + function graphs). */

export type QuestStimulusTable = {
  kind: "table";
  title?: string;
  headers: string[];
  rows: string[][];
};

export type QuestStimulusCurve = {
  expression: string;
  color?: string;
  label?: string;
};

export type QuestStimulusPoint = {
  x: number;
  y: number;
  label?: string;
};

export type QuestStimulusRiemann = {
  method: "midpoint" | "left" | "right";
  from: number;
  to: number;
  n: number;
  /** Explicit bar heights (preferred when from a table). */
  heights?: number[];
  /** Or sample heights from an expression in x. */
  expression?: string;
};

export type QuestStimulusFunctionGraph = {
  kind: "function_graph";
  title?: string;
  alt: string;
  xLabel?: string;
  yLabel?: string;
  domain?: [number, number];
  range?: [number, number];
  curves?: QuestStimulusCurve[];
  points?: QuestStimulusPoint[];
  riemann?: QuestStimulusRiemann;
};

export type QuestStimulus = QuestStimulusTable | QuestStimulusFunctionGraph;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseStringMatrix(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!Array.isArray(row)) return [];
      return row.map((cell) => asString(cell));
    })
    .filter((row) => row.some((cell) => cell.length > 0));
}

function parseTable(raw: Record<string, unknown>): QuestStimulusTable | null {
  const headers = Array.isArray(raw.headers)
    ? raw.headers.map((h) => asString(h)).filter(Boolean)
    : [];
  const rows = parseStringMatrix(raw.rows);
  if (headers.length === 0 || rows.length === 0) return null;
  const title = asString(raw.title);
  return {
    kind: "table",
    title: title || undefined,
    headers,
    rows,
  };
}

function parseDomainRange(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const a = asNumber(value[0]);
  const b = asNumber(value[1]);
  if (a == null || b == null || a === b) return undefined;
  return a < b ? [a, b] : [b, a];
}

function parseGraph(raw: Record<string, unknown>): QuestStimulusFunctionGraph | null {
  const alt = asString(raw.alt) || "Function graph";
  const curves: QuestStimulusCurve[] = [];
  if (Array.isArray(raw.curves)) {
    for (const entry of raw.curves) {
      if (!isRecord(entry)) continue;
      const expression = asString(entry.expression);
      if (!expression) continue;
      curves.push({
        expression,
        color: asString(entry.color) || undefined,
        label: asString(entry.label) || undefined,
      });
    }
  }

  const points: QuestStimulusPoint[] = [];
  if (Array.isArray(raw.points)) {
    for (const entry of raw.points) {
      if (!isRecord(entry)) continue;
      const x = asNumber(entry.x);
      const y = asNumber(entry.y);
      if (x == null || y == null) continue;
      points.push({
        x,
        y,
        label: asString(entry.label) || undefined,
      });
    }
  }

  let riemann: QuestStimulusRiemann | undefined;
  if (isRecord(raw.riemann)) {
    const methodRaw = asString(raw.riemann.method).toLowerCase();
    const method =
      methodRaw === "left" || methodRaw === "right" || methodRaw === "midpoint"
        ? methodRaw
        : null;
    const from = asNumber(raw.riemann.from);
    const to = asNumber(raw.riemann.to);
    const n = asNumber(raw.riemann.n);
    if (method && from != null && to != null && n != null && n > 0) {
      const heights = Array.isArray(raw.riemann.heights)
        ? raw.riemann.heights
            .map((h) => asNumber(h))
            .filter((h): h is number => h != null)
        : undefined;
      riemann = {
        method,
        from,
        to,
        n: Math.floor(n),
        heights: heights && heights.length > 0 ? heights : undefined,
        expression: asString(raw.riemann.expression) || undefined,
      };
    }
  }

  if (curves.length === 0 && points.length === 0 && !riemann) return null;

  return {
    kind: "function_graph",
    title: asString(raw.title) || undefined,
    alt,
    xLabel: asString(raw.xLabel ?? raw.x_label) || undefined,
    yLabel: asString(raw.yLabel ?? raw.y_label) || undefined,
    domain: parseDomainRange(raw.domain),
    range: parseDomainRange(raw.range),
    curves: curves.length > 0 ? curves : undefined,
    points: points.length > 0 ? points : undefined,
    riemann,
  };
}

export function parseQuestStimulus(raw: unknown): QuestStimulus[] {
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : isRecord(raw) ? [raw] : [];
  const out: QuestStimulus[] = [];

  for (const entry of list) {
    if (!isRecord(entry)) continue;
    const kind = asString(entry.kind).toLowerCase();
    if (kind === "table") {
      const table = parseTable(entry);
      if (table) out.push(table);
      continue;
    }
    if (kind === "function_graph" || kind === "graph") {
      const graph = parseGraph(entry);
      if (graph) out.push(graph);
    }
  }

  return out;
}

export function hasQuestStimulus(stimulus: QuestStimulus[] | undefined | null): boolean {
  return Array.isArray(stimulus) && stimulus.length > 0;
}

/** Sample curve points for SVG plotting (pure; uses provided evaluate). */
export function sampleCurvePoints(
  expression: string,
  domain: [number, number],
  sampleCount: number,
  evaluate: (expression: string, x: number) => number | null,
): Array<{ x: number; y: number }> {
  const [xMin, xMax] = domain;
  const n = Math.max(2, Math.min(200, Math.floor(sampleCount)));
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = xMin + (xMax - xMin) * t;
    const y = evaluate(expression, x);
    if (y != null && Number.isFinite(y)) points.push({ x, y });
  }
  return points;
}

export function riemannBarCenters(input: {
  method: "midpoint" | "left" | "right";
  from: number;
  to: number;
  n: number;
}): Array<{ xLeft: number; xRight: number; xSample: number }> {
  const n = Math.max(1, Math.floor(input.n));
  const width = (input.to - input.from) / n;
  const bars: Array<{ xLeft: number; xRight: number; xSample: number }> = [];
  for (let i = 0; i < n; i++) {
    const xLeft = input.from + i * width;
    const xRight = xLeft + width;
    const xSample =
      input.method === "left"
        ? xLeft
        : input.method === "right"
          ? xRight
          : (xLeft + xRight) / 2;
    bars.push({ xLeft, xRight, xSample });
  }
  return bars;
}

export function inferGraphDomain(graph: QuestStimulusFunctionGraph): [number, number] {
  if (graph.domain) return graph.domain;
  if (graph.riemann) {
    return graph.riemann.from < graph.riemann.to
      ? [graph.riemann.from, graph.riemann.to]
      : [graph.riemann.to, graph.riemann.from];
  }
  if (graph.points && graph.points.length > 0) {
    const xs = graph.points.map((p) => p.x);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    if (min === max) return [min - 1, max + 1];
    const pad = (max - min) * 0.08;
    return [min - pad, max + pad];
  }
  return [-2, 2];
}

export function inferGraphRange(
  graph: QuestStimulusFunctionGraph,
  plottedYs: number[],
): [number, number] {
  if (graph.range) return graph.range;
  const ys = [
    ...plottedYs,
    ...(graph.points?.map((p) => p.y) ?? []),
    ...(graph.riemann?.heights ?? []),
  ].filter((y) => Number.isFinite(y));
  if (ys.length === 0) return [-1, 1];
  const min = Math.min(...ys, 0);
  const max = Math.max(...ys, 0);
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.12;
  return [min - pad, max + pad];
}

function parseNumericCell(value: string): number | null {
  const cleaned = value.replace(/[,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Extract ordered (x,y) pairs from a 2+ column numeric table. */
export function numericPointsFromTable(table: QuestStimulusTable): QuestStimulusPoint[] {
  const points: QuestStimulusPoint[] = [];
  for (const row of table.rows) {
    if (row.length < 2) continue;
    const x = parseNumericCell(row[0] ?? "");
    const y = parseNumericCell(row[1] ?? "");
    if (x == null || y == null) continue;
    points.push({ x, y });
  }
  return points;
}

export function detectRiemannFromPrompt(prompt: string): {
  method: "midpoint" | "left" | "right";
  n: number;
} | null {
  const text = prompt.toLowerCase();
  const method = text.includes("midpoint")
    ? "midpoint"
    : text.includes("left riemann") || /\bleft\b.*\briemann|\briemann\b.*\bleft\b/.test(text)
      ? "left"
      : text.includes("right riemann") || /\bright\b.*\briemann|\briemann\b.*\bright\b/.test(text)
        ? "right"
        : text.includes("riemann")
          ? "midpoint"
          : null;
  if (!method) return null;

  const nMatch =
    text.match(/(\d+)\s+equal\s+subintervals?/) ||
    text.match(/(\d+)\s+subintervals?/) ||
    text.match(/(\d+)\s+rectangles?/);
  const n = nMatch ? Number(nMatch[1]) : NaN;
  if (!Number.isFinite(n) || n < 1) return null;
  return { method, n: Math.floor(n) };
}

export function riemannHeightsFromPoints(
  points: QuestStimulusPoint[],
  method: "midpoint" | "left" | "right",
  n: number,
): { from: number; to: number; heights: number[] } | null {
  if (points.length < 2 || n < 1) return null;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const from = sorted[0]!.x;
  const to = sorted[sorted.length - 1]!.x;
  if (from === to) return null;

  const width = (to - from) / n;
  const heights: number[] = [];

  const yAt = (x: number): number | null => {
    const exact = sorted.find((p) => Math.abs(p.x - x) < 1e-9);
    if (exact) return exact.y;
    // nearest point for sampled midpoints on discrete tables
    let best = sorted[0]!;
    let bestDist = Math.abs(best.x - x);
    for (const p of sorted) {
      const d = Math.abs(p.x - x);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best.y;
  };

  for (let i = 0; i < n; i++) {
    const xLeft = from + i * width;
    const xRight = xLeft + width;
    const xSample =
      method === "left" ? xLeft : method === "right" ? xRight : (xLeft + xRight) / 2;
    const y = yAt(xSample);
    if (y == null) return null;
    heights.push(y);
  }

  return { from, to, heights };
}

/** Pull a simple y=f(x) / f(x)=... expression for graphing. */
export function detectCurveExpressionFromPrompt(prompt: string): string | null {
  const patterns = [
    /\bf\s*\(\s*x\s*\)\s*=\s*([^\n.]+)/i,
    /\by\s*=\s*([^\n.]+)/i,
    /\bg\s*\(\s*x\s*\)\s*=\s*([^\n.]+)/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (!match?.[1]) continue;
    const expression = match[1]
      .trim()
      .replace(/\s+/g, "")
      .replace(/·/g, "*")
      .replace(/\u2212/g, "-");
    if (expression.length < 1 || expression.length > 80) continue;
    if (!/[0-9xX]/.test(expression)) continue;
    return expression.replace(/X/g, "x");
  }
  return null;
}

function promptWantsGraph(prompt: string): boolean {
  const text = prompt.toLowerCase();
  return (
    text.includes("graph") ||
    text.includes("riemann") ||
    text.includes("velocity") ||
    text.includes("distance traveled") ||
    text.includes("area") ||
    text.includes("integral") ||
    text.includes("table below") ||
    text.includes("in the table") ||
    text.includes("from the table")
  );
}

function stripMarkdownTablesFromPrompt(prompt: string): string {
  const lines = prompt.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const isPipe = /^\s*\|.+\|\s*$/.test(line);
    if (isPipe) {
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i]!)) i += 1;
      continue;
    }
    kept.push(line);
    i += 1;
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function tablesFromPromptMarkdown(prompt: string): QuestStimulusTable[] {
  // Lightweight markdown table scan (mirrors quest prompt table parsing).
  const lines = prompt.replace(/\r\n/g, "\n").split("\n");
  const tables: QuestStimulusTable[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!/^\s*\|.+\|\s*$/.test(lines[i]!)) {
      i += 1;
      continue;
    }
    const block: string[] = [];
    while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i]!)) {
      block.push(lines[i]!);
      i += 1;
    }
    if (block.length < 2) continue;
    const splitRow = (row: string) =>
      row
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
    const headers = splitRow(block[0]!);
    let bodyStart = 1;
    if (block[1] && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(block[1])) {
      bodyStart = 2;
    }
    const rows = block.slice(bodyStart).map(splitRow).filter((r) => r.some(Boolean));
    if (headers.length > 0 && rows.length > 0) {
      tables.push({ kind: "table", headers, rows });
    }
  }
  return tables;
}

/**
 * Ensure quest items show tables/graphs when the prompt or stimulus has the data.
 * Explicit stimulus wins; markdown tables are promoted; numeric tables get graphs.
 */
export function enrichQuestStimulus(input: {
  prompt: string;
  stimulus?: QuestStimulus[] | null;
}): { prompt: string; stimulus: QuestStimulus[] } {
  const stimulus = [...parseQuestStimulus(input.stimulus)];
  let prompt = input.prompt;

  const hasTable = stimulus.some((s) => s.kind === "table");
  const markdownTables = tablesFromPromptMarkdown(prompt);
  if (!hasTable && markdownTables.length > 0) {
    stimulus.push(...markdownTables);
    prompt = stripMarkdownTablesFromPrompt(prompt);
  }

  const hasGraph = stimulus.some((s) => s.kind === "function_graph");
  const table =
    stimulus.find((s): s is QuestStimulusTable => s.kind === "table") ?? null;
  const points = table ? numericPointsFromTable(table) : [];
  const riemannHint = detectRiemannFromPrompt(input.prompt);
  const curve = detectCurveExpressionFromPrompt(input.prompt);

  if (!hasGraph) {
    if (points.length >= 2 && (promptWantsGraph(input.prompt) || riemannHint || points.length >= 3)) {
      const xLabel = table?.headers[0]?.trim() || "x";
      const yLabel = table?.headers[1]?.trim() || "y";
      const graph: QuestStimulusFunctionGraph = {
        kind: "function_graph",
        title: riemannHint ? `${riemannHint.method} Riemann sum` : "Data graph",
        alt: riemannHint
          ? `${yLabel} values with ${riemannHint.method} rectangles`
          : `${yLabel} versus ${xLabel}`,
        xLabel,
        yLabel,
        points,
      };

      if (riemannHint) {
        const bars = riemannHeightsFromPoints(points, riemannHint.method, riemannHint.n);
        if (bars) {
          graph.riemann = {
            method: riemannHint.method,
            from: bars.from,
            to: bars.to,
            n: riemannHint.n,
            heights: bars.heights,
          };
          graph.domain = [bars.from, bars.to];
        }
      }

      stimulus.push(graph);
    } else if (curve) {
      stimulus.push({
        kind: "function_graph",
        title: "Function graph",
        alt: `Graph of ${curve}`,
        xLabel: "x",
        yLabel: "y",
        domain: [-3, 3],
        curves: [{ expression: curve, color: "#7C3AED" }],
      });
    }
  } else if (riemannHint) {
    // Fill missing Riemann bars on an existing graph that has points but no riemann.
    const graphIndex = stimulus.findIndex((s) => s.kind === "function_graph");
    const graph = stimulus[graphIndex];
    if (graph && graph.kind === "function_graph" && !graph.riemann) {
      const graphPoints = graph.points ?? points;
      const bars = riemannHeightsFromPoints(graphPoints, riemannHint.method, riemannHint.n);
      if (bars) {
        stimulus[graphIndex] = {
          ...graph,
          riemann: {
            method: riemannHint.method,
            from: bars.from,
            to: bars.to,
            n: riemannHint.n,
            heights: bars.heights,
          },
          domain: graph.domain ?? [bars.from, bars.to],
        };
      }
    }
  }

  return { prompt, stimulus };
}

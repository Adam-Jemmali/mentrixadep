/** One segment of a quest prompt: prose or a markdown pipe table. */
export type QuestPromptBlock =
  | { type: "text"; content: string }
  | { type: "table"; headers: string[]; rows: string[][] };

type TextSegment = { math: boolean; content: string };

function splitByExistingMath(text: string): TextSegment[] {
  const parts: TextSegment[] = [];
  const re = /\$\$[\s\S]*?\$\$|\$[^$\n]+?\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ math: false, content: text.slice(last, m.index) });
    parts.push({ math: true, content: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ math: false, content: text.slice(last) });
  return parts.length > 0 ? parts : [{ math: false, content: text }];
}

function normalizeCarets(expr: string): string {
  return expr
    .replace(/\^\(([^)]+)\)/g, "^{$1}")
    .replace(/\^([0-9]+)/g, "^{$1}")
    .replace(/\^([a-zA-Z])/g, "^{$1}");
}

function convertLimitNotation(expr: string): string {
  return expr
    .replace(/\blim\s*\(\s*([a-zA-Z]+)\s*(?:->|→)\s*([^)]+?)\s*\)/gi, "\\lim_{$1 \\to $2}")
    .replace(/\blim_\(([^)]+?)\s*(?:->|→)\s*([^)]+?)\)/gi, "\\lim_{$1 \\to $2}");
}

function convertBracketFractions(expr: string): string {
  return expr.replace(/\[([^\]]+)\]\s*\/\s*([^\s,;.]+)/g, (_, num, den) => {
    return `\\frac{${num.trim()}}{${den.trim()}}`;
  });
}

/** Plain-text calculus/algebra → LaTeX body (no outer $). */
export function convertPlainMathExpression(expr: string): string {
  let t = normalizeUnicodeMathChars(expr.trim());
  t = convertLimitNotation(t);
  t = convertBracketFractions(t);
  t = normalizeCarets(t);
  return t;
}

function normalizeUnicodeMathChars(s: string): string {
  return s.replace(/\u2212/g, "-").replace(/\u2013/g, "-").replace(/\u2014/g, "-");
}

function wrapFunctionPrimes(s: string): string {
  return s.replace(/\bf(['′])\(([^)]+)\)/g, (_, _p, args) => `$f'(${args})$`);
}

function wrapInlineLimitEquations(s: string): string {
  return s.replace(
    /\blim\s*\(\s*([a-zA-Z]+)\s*(?:->|→)\s*([^)]+?)\s*\)\s*([a-zA-Z](?:\([^)]*\))?)\s*=\s*(?:∞|\\infty|infinity)/gi,
    (_, v, to, fn) => `$\\lim_{${v.trim()} \\to ${to.trim()}} ${fn.trim()} = \\infty$`,
  );
}

function wrapInlineLimitQuotients(s: string): string {
  return s.replace(
    /\blim\s*\(\s*([a-zA-Z]+)\s*(?:->|→)\s*([^)]+?)\s*\)\s*\[([^\]]+)\]\s*\/\s*([^\s,;.]+)/gi,
    (_, v, to, num, den) => {
      const n = normalizeCarets(normalizeUnicodeMathChars(num.trim()));
      const d = den.trim();
      return `$\\lim_{${v.trim()} \\to ${to.trim()}} \\frac{${n}}{${d}}$`;
    },
  );
}

function wrapFunctionEqualsInProse(s: string): string {
  return s.replace(
    /\b([a-zA-Z])\(([^)]+)\)\s*=\s*([0-9x+\-−*/^()[\].\s]+?)(?=\s+(?:into|gives|the|and|or|where|when|which|that|for|with|option|answer|we|you|is|are|was|were|be|by|from|at|on|in|to|a|an)\b|[?.!,;]|$)/gi,
    (full, name, args, rhs) => {
      const body = normalizeUnicodeMathChars(rhs.trim());
      if (!/[\^+\-*/0-9]/.test(body)) return full;
      return `$${convertPlainMathExpression(`${name}(${args}) = ${body}`)}$`;
    },
  );
}

function wrapBracketDifferenceQuotient(s: string): string {
  return s.replace(
    /\[([fF]\([^)]+\)[^\]]*)\]\s*\/\s*([a-zA-Z0-9]+)/g,
    (_, num, den) => `$\\frac{${normalizeCarets(normalizeUnicodeMathChars(num.trim()))}}{${den}}$`,
  );
}

function looksLikeStandaloneMath(s: string): boolean {
  const t = s.trim();
  if (!t || t.includes("$") || t.length > 120) return false;
  if (/\s+(?:into|gives|the|formula|option|answer|definition|derivative)\b/i.test(t)) return false;
  if (/^\s*lim\s*[\_(]?/i.test(t)) return true;
  if (/^[\w\s()+\-*/^[\].,=]+$/.test(t) && /\^/.test(t) && /[+\-*/]/.test(t)) return true;
  return false;
}

function inlineCodeToMath(inner: string): string {
  const math = convertPlainMathExpression(
    inner.replace(/lim_\(([^)]+?)\s*->\s*([^)]+?)\)/gi, "lim($1->$2)"),
  );

  const looksMath =
    /\\lim|\\frac|\\sqrt|[=_^]|\\to\b/.test(math) ||
    /^[a-zA-Z]$/.test(math) ||
    /^[a-zA-Z]\([a-zA-Z0-9,\s]+\)$/.test(math) ||
    /^[a-zA-Z]'?\([a-zA-Z]\)$/.test(math);

  if (looksMath) return `$${math}$`;
  return math;
}

function transformPlainSegment(segment: string): string {
  if (!segment.trim()) return segment;

  if (looksLikeStandaloneMath(segment.trim())) {
    return `$${convertPlainMathExpression(segment.trim())}$`;
  }

  let s = segment;

  s = wrapFunctionPrimes(s);
  s = wrapInlineLimitEquations(s);
  s = wrapInlineLimitQuotients(s);
  s = wrapFunctionEqualsInProse(s);
  s = wrapBracketDifferenceQuotient(s);

  s = s.replace(/\blim_\(([^)]+?)\s*->\s*([^)]+?)\)/gi, (_, from: string, to: string) => {
    return `$\\lim_{${from.trim()} \\to ${to.trim()}}$`;
  });

  return s;
}

/** Convert item-bank / AI markdown and plain-text math into KaTeX-friendly text. */
export function formatQuestPromptText(input: string): string {
  let text = input.replace(/\r\n/g, "\n");

  text = text.replace(/`([^`\n]+)`/g, (_, raw: string) => inlineCodeToMath(raw.trim()));

  const segments = splitByExistingMath(text);
  return segments
    .map((seg) => (seg.math ? seg.content : transformPlainSegment(seg.content)))
    .join("");
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.includes("|", 1);
}

function isSeparatorRow(line: string): boolean {
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function formatTableCell(cell: string): string {
  let s = formatQuestPromptText(cell.trim());
  if (/\$/.test(s)) return s;
  const fnMatch = /^([a-zA-Z]+\([a-zA-Z0-9]+\))(\s*\([^)]+\))?$/.exec(s);
  if (fnMatch) return `$${fnMatch[1]}$${fnMatch[2] ?? ""}`;
  if (/^[a-zA-Z]$/.test(s)) return `$${s}$`;
  return s;
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  const headerLine = lines[0]!;
  if (!isTableRow(headerLine)) return null;

  let bodyStart = 1;
  if (lines[1] && isSeparatorRow(lines[1])) bodyStart = 2;

  const headers = parseTableRow(headerLine).map(formatTableCell);
  const rows: string[][] = [];
  for (let i = bodyStart; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (!isTableRow(line)) break;
    if (isSeparatorRow(line)) continue;
    const cells = parseTableRow(line).map(formatTableCell);
    if (cells.length > 0) rows.push(cells);
  }

  if (headers.length === 0 || rows.length === 0) return null;
  return { headers, rows };
}

/** Split prompt into prose blocks and pipe tables. */
export function parseQuestPromptBlocks(input: string): QuestPromptBlock[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: QuestPromptBlock[] = [];
  const textBuffer: string[] = [];

  const flushText = () => {
    const content = textBuffer.join("\n").trim();
    textBuffer.length = 0;
    if (content) blocks.push({ type: "text", content });
  };

  let i = 0;
  while (i < lines.length) {
    if (isTableRow(lines[i]!)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i]!)) {
        tableLines.push(lines[i]!);
        i += 1;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        flushText();
        blocks.push({ type: "table", ...table });
      } else {
        textBuffer.push(...tableLines);
      }
    } else {
      textBuffer.push(lines[i]!);
      i += 1;
    }
  }

  flushText();
  return blocks.length > 0 ? blocks : [{ type: "text", content: input.trim() }];
}

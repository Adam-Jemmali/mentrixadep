export type QuestPromptHighlightKind = "plain" | "number" | "unit" | "keyword";

export type QuestPromptHighlightToken = {
  kind: QuestPromptHighlightKind;
  text: string;
};

type HighlightMatch = {
  start: number;
  end: number;
  kind: Exclude<QuestPromptHighlightKind, "plain">;
  text: string;
};

const MATH_SEGMENT_RE = /\$\$[\s\S]*?\$\$|\$[^$\n]+?\$/g;

/** AP Calculus AB phrases — longest first so multi-word terms win. */
const AP_CALC_KEYWORD_PHRASES = [
  "fundamental theorem of calculus",
  "intermediate value theorem",
  "extreme value theorem",
  "mean value theorem",
  "horizontal asymptote",
  "vertical asymptote",
  "implicit differentiation",
  "linear approximation",
  "absolute maximum",
  "absolute minimum",
  "local maximum",
  "local minimum",
  "global maximum",
  "global minimum",
  "critical point",
  "critical points",
  "inflection point",
  "second derivative",
  "first derivative",
  "derivative test",
  "related rates",
  "chain rule",
  "product rule",
  "quotient rule",
  "trapezoidal rule",
  "Riemann sum",
  "concave up",
  "concave down",
  "rate of change",
  "tangent line",
  "normal line",
  "secant line",
  "antiderivative",
  "differentiable",
  "differentiation",
  "discontinuity",
  "asymptote",
  "asymptotes",
  "continuity",
  "continuous",
  "concavity",
  "derivative",
  "derivatives",
  "integrate",
  "integration",
  "polynomial",
  "exponential",
  "logarithm",
  "acceleration",
  "substitution",
  "approaches",
  "extrema",
  "function",
  "integral",
  "integrals",
  "interval",
  "velocity",
  "maximum",
  "minimum",
  "evaluate",
  "estimate",
  "limit",
  "limits",
  "domain",
  "range",
  "graph",
  "curve",
  "slope",
  "speed",
  "units",
].sort((a, b) => b.length - a.length);

const KEYWORD_RE = new RegExp(
  `\\b(?:${AP_CALC_KEYWORD_PHRASES.map((phrase) =>
    phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})\\b`,
  "gi",
);

const NUMBER_RE = /-?\d+(?:,\d{3})*(?:\.\d+)?(?:\/\d+)?/g;

const UNIT_RE =
  /\b(?:m\/s²|m\/s²|m\/s|cm|mm|km|ft|in|sec|seconds?|minutes?|hrs?|hours?|kg|g|lb|N|newtons?|J|joules?|W|watts?|Pa|pascals?|mol|moles?|mL|L|liters?|litres?|°C|°F|degrees?|radians?|rad|units?)\b/gi;

function splitByMathSegments(text: string): { math: boolean; content: string }[] {
  const parts: { math: boolean; content: string }[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MATH_SEGMENT_RE.source, MATH_SEGMENT_RE.flags);
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ math: false, content: text.slice(last, match.index) });
    }
    parts.push({ math: true, content: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ math: false, content: text.slice(last) });
  return parts.length > 0 ? parts : [{ math: false, content: text }];
}

function collectMatches(text: string, re: RegExp, kind: HighlightMatch["kind"]): HighlightMatch[] {
  const matches: HighlightMatch[] = [];
  const pattern = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      kind,
      text: match[0],
    });
  }
  return matches;
}

function mergeHighlightMatches(text: string): HighlightMatch[] {
  const matches = [
    ...collectMatches(text, NUMBER_RE, "number"),
    ...collectMatches(text, UNIT_RE, "unit"),
    ...collectMatches(text, KEYWORD_RE, "keyword"),
  ].sort((a, b) => a.start - b.start || b.end - a.end);

  const merged: HighlightMatch[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    merged.push(match);
    cursor = match.end;
  }
  return merged;
}

export function tokenizeQuestPromptHighlights(text: string): QuestPromptHighlightToken[] {
  if (!text) return [];

  const tokens: QuestPromptHighlightToken[] = [];
  for (const segment of splitByMathSegments(text)) {
    if (segment.math) {
      tokens.push({ kind: "plain", text: segment.content });
      continue;
    }

    const prose = segment.content;
    const matches = mergeHighlightMatches(prose);
    if (matches.length === 0) {
      tokens.push({ kind: "plain", text: prose });
      continue;
    }

    let cursor = 0;
    for (const match of matches) {
      if (match.start > cursor) {
        tokens.push({ kind: "plain", text: prose.slice(cursor, match.start) });
      }
      tokens.push({ kind: match.kind, text: match.text });
      cursor = match.end;
    }
    if (cursor < prose.length) {
      tokens.push({ kind: "plain", text: prose.slice(cursor) });
    }
  }

  return tokens;
}

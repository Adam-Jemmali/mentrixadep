const DIFFERENTIAL_VARS = "xtyu";

const MATH_SEGMENT_RE = /\$\$[\s\S]*?\$\$|\$[^$\n]+?\$/g;

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

/** Item-bank shorthand `\dx` → KaTeX-friendly `\,dx`. */
export function fixDifferentialShorthand(text: string): string {
  return text.replace(new RegExp(`\\\\d([${DIFFERENTIAL_VARS}])\\b`, "g"), "\\,d$1");
}

/** Safe global cleanup for split `$` signs in integral notation. */
export function stripSpuriousDollarSigns(text: string): string {
  let s = text;
  s = s.replace(
    new RegExp(`(\\\\,\\s*d[${DIFFERENTIAL_VARS}]|d[${DIFFERENTIAL_VARS}])\\$\\s*=`, "g"),
    "$1 =",
  );
  s = s.replace(/(\d|[a-zA-Z])\$\s*(\\int)/g, "$1$2");
  s = s.replace(/([±+\-])\s*d\$\s*(\\int)/g, "$1 d$2");
  return s;
}

const INTEGRAL_EQUATION_TAIL =
  /(?=\$?\s+and\b|\$?\s+what\b|,|\?|$|\s*\$)/;

/** Wrap bare `\int_a^b ... dx = value` spans. */
export function wrapIntegralEquations(text: string): string {
  return text.replace(
    new RegExp(
      `(?<!\\$)\\\\int_\\{([^}]+)\\}\\^\\{([^}]+)\\}((?:(?!\\\\int)[\\s\\S])*?)\\\\,?\\s*d([${DIFFERENTIAL_VARS}])\\s*=\\s*([-0-9.()+\\-*/\\s]+?)\\$?${INTEGRAL_EQUATION_TAIL.source}`,
      "gi",
    ),
    (_, lo, hi, mid, v, rhs) => `$\\int_{${lo}}^{${hi}}${mid}\\,d${v} = ${rhs.trim()}$`,
  );
}

/** Wrap a single bare definite integral (no trailing equation). */
export function wrapSingleIntegrals(text: string): string {
  return text.replace(
    new RegExp(
      `(?<!\\$)\\\\int_\\{([^}]+)\\}(?:\\^\\{([^}]+)\\})?((?:(?!\\\\int)[\\s\\S])*?)\\\\,?\\s*d([${DIFFERENTIAL_VARS}])(?!\\s*=)`,
      "g",
    ),
    (_, lo, hi, mid, v) => `$\\int_{${lo}}${hi ? `^{${hi}}` : ""}${mid}\\,d${v}$`,
  );
}

/** Wrap long multi-integral bare LaTeX runs (e.g. linearity property). */
export function wrapMultiIntegralFormulas(text: string): string {
  return text.replace(
    /(?<!\$)(\\int_\{[^}]+\}[\s\S]*?\\,?\s*d[xtyu][\s\S]*?)(?=\.\s+[A-Z])/g,
    (match) => `$${match.trim()}$`,
  );
}

function sanitizeMathSegment(segment: string): string {
  const inner = segment.startsWith("$$")
    ? { open: "$$", body: segment.slice(2, -2), close: "$$" }
    : segment.startsWith("$")
      ? { open: "$", body: segment.slice(1, -1), close: "$" }
      : null;

  if (!inner) return fixDifferentialShorthand(segment);

  const repaired = fixDifferentialShorthand(inner.body.replace(/\\\s+d([xtyu])/g, "\\,d$1"));
  return `${inner.open}${repaired}${inner.close}`;
}

/** Full repair pass for malformed item-bank math before KaTeX. */
export function sanitizeQuestMathInput(text: string): string {
  let prepped = fixDifferentialShorthand(text);
  prepped = stripSpuriousDollarSigns(prepped);
  prepped = wrapMultiIntegralFormulas(prepped);
  prepped = wrapIntegralEquations(prepped);
  prepped = wrapSingleIntegrals(prepped);

  return splitByMathSegments(prepped)
    .map((segment) =>
      segment.math ? sanitizeMathSegment(segment.content) : segment.content,
    )
    .join("");
}

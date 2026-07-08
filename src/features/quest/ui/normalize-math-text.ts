import {
  fixDifferentialShorthand,
  sanitizeQuestMathInput,
} from "@/features/quest/ui/sanitize-quest-math";

type SegmentKind = "plain" | "inline" | "display";

type InputSegment = { kind: SegmentKind; content: string };

/** Read a LaTeX command starting at index `start` (must point to `\`). */
function readLatexCommand(text: string, start: number): string | null {
  if (text[start] !== "\\") return null;
  let i = start + 1;
  while (i < text.length && /[a-zA-Z]/.test(text[i]!)) i += 1;
  if (i === start + 1) return null;

  let end = i;
  while (end < text.length && text[end] === "{") {
    const group = readBracedGroup(text, end);
    if (!group) break;
    end = group.end;
  }
  while (end < text.length && (text[end] === "_" || text[end] === "^")) {
    end += 1;
    if (text[end] === "{") {
      const group = readBracedGroup(text, end);
      if (!group) break;
      end = group.end;
    } else if (text[end] != null) {
      end += 1;
    } else {
      break;
    }
  }
  return text.slice(start, end);
}

function readBracedGroup(text: string, start: number): { end: number } | null {
  if (text[start] !== "{") return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return { end: i + 1 };
    }
  }
  return null;
}

function findMathDelimiterEnd(text: string, start: number, display: boolean): number {
  if (display) {
    const closeAt = text.indexOf("$$", start + 2);
    return closeAt >= 0 ? closeAt + 2 : text.length;
  }
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === "$" && text[i - 1] !== "\\") return i + 1;
  }
  return start + 1;
}

/** Split text into prose vs existing $ / $$ math spans. */
function splitInputSegments(text: string): InputSegment[] {
  const parts: InputSegment[] = [];
  let i = 0;
  let plainStart = 0;

  const flushPlain = (end: number) => {
    if (end > plainStart) {
      parts.push({ kind: "plain", content: text.slice(plainStart, end) });
    }
    plainStart = end;
  };

  while (i < text.length) {
    if (text.slice(i, i + 2) === "$$") {
      flushPlain(i);
      const close = text.indexOf("$$", i + 2);
      if (close < 0) {
        i += 1;
        continue;
      }
      parts.push({ kind: "display", content: text.slice(i, close + 2) });
      i = close + 2;
      plainStart = i;
      continue;
    }
    if (text[i] === "$" && text[i - 1] !== "\\") {
      flushPlain(i);
      const end = findMathDelimiterEnd(text, i, false);
      if (end <= i + 1) {
        i += 1;
        continue;
      }
      parts.push({ kind: "inline", content: text.slice(i, end) });
      i = end;
      plainStart = i;
      continue;
    }
    i += 1;
  }

  flushPlain(text.length);
  return parts.length > 0 ? parts : [{ kind: "plain", content: text }];
}

/** Wrap full \\begin{...}...\\end{...} blocks for KaTeX display math. */
function wrapLatexEnvironmentBlocks(text: string): string {
  return text.replace(
    /\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g,
    (full) => (full.startsWith("$$") ? full : `$$${full}$$`),
  );
}

/** Wrap definite-integral expressions that omit $ delimiters. */
function wrapIntegralSpans(text: string): string {
  return text.replace(
    /(?<!\$)\\int(?:_\{[^}]+\})?(?:\^\{[^}]+\})?[\s\S]*?\\,?\s*d[xtyu]/g,
    (full) => `$${full.trim()}$`,
  );
}

const DISPLAY_ENV_RE =
  /\\begin\{(cases|array|align\*?|aligned|gather\*?|matrix|pmatrix|bmatrix|vmatrix)\}/;

function repairMathBody(body: string): string {
  return fixDifferentialShorthand(body.replace(/\\\s+d([xtyu])/g, "\\,d$1"));
}

function finalizeMathSegment(kind: "inline" | "display", wrapped: string): string {
  const body = kind === "display" ? wrapped.slice(2, -2) : wrapped.slice(1, -1);
  const repaired = repairMathBody(body);
  if (kind === "inline" && DISPLAY_ENV_RE.test(repaired)) {
    return `$$${repaired}$$`;
  }
  return kind === "display" ? `$$${repaired}$$` : `$${repaired}$`;
}

function normalizePlainSegment(segment: string): string {
  let text = segment;
  text = wrapLatexEnvironmentBlocks(text);
  if (!/\$\\int[\s\S]*?\\,d[xtyu]/.test(text)) {
    text = wrapIntegralSpans(text);
  }

  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text.slice(i, i + 2) === "$$") {
      const end = findMathDelimiterEnd(text, i, true);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    if (text[i] === "$") {
      const end = findMathDelimiterEnd(text, i, false);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    if (text[i] === "\\" && /[a-zA-Z]/.test(text[i + 1] ?? "")) {
      const cmd = readLatexCommand(text, i);
      if (cmd) {
        out += `$${cmd}$`;
        i += cmd.length;
        continue;
      }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/**
 * Normalize mixed plain + LaTeX strings for KaTeX:
 * - repair item-bank `\dx` and stray `$` delimiters
 * - unescape \$ → $
 * - \( ... \) → $...$
 * - wrap bare commands like \frac{a}{b} in $...$
 * - never double-wrap environments already inside $...$
 */
export function normalizeMathText(input: string): string {
  let text = sanitizeQuestMathInput(input);
  text = text.replace(/\\\$/g, "$");
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) => `$${inner.trim()}$`);

  return splitInputSegments(text)
    .map((segment) => {
      if (segment.kind === "plain") return normalizePlainSegment(segment.content);
      return finalizeMathSegment(segment.kind, segment.content);
    })
    .join("");
}

export function textContainsMath(input: string): boolean {
  const normalized = normalizeMathText(input);
  if (/\\\(|\\\$|\$\$|\$[^$\n]+\$|\\[a-zA-Z]/.test(normalized)) return true;
  return /\blim\s*[\_(]?|\^|[+\-*/]\s*\(|[a-zA-Z]\([a-zA-Z]\)\s*=/.test(input);
}

let katexWarmPromise: Promise<typeof import("katex")> | null = null;

/** Preload KaTeX + CSS (e.g. when a practice pack starts). */
export function warmKatex(): Promise<typeof import("katex")> {
  if (!katexWarmPromise) {
    katexWarmPromise = import("katex").then((mod) => {
      void import("katex/dist/katex.min.css");
      return mod;
    });
  }
  return katexWarmPromise;
}

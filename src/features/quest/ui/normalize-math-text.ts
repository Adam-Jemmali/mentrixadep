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

/**
 * Normalize mixed plain + LaTeX strings for KaTeX:
 * - unescape \$ → $
 * - \( ... \) → $...$
 * - wrap bare commands like \frac{a}{b} in $...$
 */
export function normalizeMathText(input: string): string {
  let text = input.replace(/\\\$/g, "$");
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) => `$${inner.trim()}$`);

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

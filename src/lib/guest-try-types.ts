/** Try Quest (marketing guest demo) — mixed modalities; validated server-side before JSON response. */

export type GuestTryQuestionKind = "mcq" | "true_false" | "flashcard" | "short_answer" | "image_mcq";

export type GuestTryQuestion = {
  id: string;
  kind: GuestTryQuestionKind;
  prompt: string;
  explanation: string;
  /** Optional illustration shown above the prompt (same-origin or approved remote). */
  promptImageUrl?: string | null;
  /** Text choices (always present for selectable kinds). */
  options?: string[];
  /** Parallel to options for image_mcq — same length as options when kind is image_mcq. */
  optionImageUrls?: string[];
  correctIndex?: number;
  referenceAnswer?: string;
};

/** Curated shapes for image_pick — never trust model URLs for binaries. */
export const GUEST_TRY_IMAGE_OPTIONS = [
  "/guest-quest/shape-square.svg",
  "/guest-quest/shape-circle.svg",
  "/guest-quest/shape-triangle.svg",
  "/guest-quest/shape-star.svg",
] as const;

/** Normalize common math typings so 3x^2 and 3x² still match reference "3x²". */
function normalizeGuestAnswerTokens(s: string): string {
  let t = s.trim().toLowerCase().replace(/\s+/g, " ");
  t = t.replace(/\*/g, "").replace(/×/g, "x").replace(/\u00b7/g, "");
  t = t.replace(/\btheta\b/g, "θ");
  t = t.replace(/(\d)\s*x\s*\^\s*2\b/g, "$1x²").replace(/(\d)\s*x\s*\^\s*3\b/g, "$1x³");
  t = t.replace(/\blog\s*\(\s*n\s*\)/g, "log(n)");
  return t;
}

function gradeSingleShortCandidate(u: string, r: string): boolean {
  if (u.length < 2 || r.length < 1) return false;
  if (u === r) return true;
  const parts = r.split(/[,;/]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.every((p) => p.length > 1 && u.includes(p))) return true;
  if (r.length <= 48 && u.includes(r)) return true;
  if (r.length > 5 && r.includes(u) && u.length >= 4) return true;
  const ratio =
    u.length > 0 && r.length > 0 ? [...u].filter((c, i) => r[i] === c).length / Math.max(u.length, r.length) : 0;
  return ratio >= 0.88 && u.length >= 6;
}

/** `referenceRaw` may list alternate acceptable phrases separated by `|` (comma clauses still mean include-all). */
export function gradeGuestShortAnswer(userRaw: string, referenceRaw: string): boolean {
  const u = normalizeGuestAnswerTokens(userRaw);
  const rawAlts = referenceRaw.split("|").map((x) => x.trim()).filter(Boolean);
  const candidates =
    rawAlts.length >= 2 ? rawAlts.map((x) => normalizeGuestAnswerTokens(x)) : [normalizeGuestAnswerTokens(referenceRaw)];
  return candidates.some((r) => gradeSingleShortCandidate(u, r));
}

const GUEST_TRY_KIND_UI: Record<GuestTryQuestionKind, { badge: string; hint: string }> = {
  mcq: { badge: "Deep cut MCQ", hint: "Wrong answers are meant to look tempting." },
  true_false: { badge: "True / False", hint: "Read every qualifier in the statement." },
  flashcard: { badge: "Flash precision", hint: "Pick the gloss that matches the term exactly." },
  short_answer: { badge: "Sharp recall", hint: "Short phrase — synonyms usually count." },
  image_mcq: { badge: "Visual pick", hint: "Match the shapes to the clue." },
};

export function guestTryKindUi(kind: GuestTryQuestionKind): { badge: string; hint: string } {
  return GUEST_TRY_KIND_UI[kind];
}

/** Client/server guard so incomplete AI rows never render empty grids. */
export function isPlayableGuestTryQuestion(q: GuestTryQuestion): boolean {
  if (!q.prompt || q.prompt.length < 8) return false;
  if (!q.explanation || q.explanation.length < 4) return false;
  switch (q.kind) {
    case "short_answer":
      return typeof q.referenceAnswer === "string" && q.referenceAnswer.trim().length >= 2;
    case "true_false":
    case "mcq":
    case "flashcard":
      return (
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex < q.options.length
      );
    case "image_mcq":
      return (
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        Array.isArray(q.optionImageUrls) &&
        q.optionImageUrls.length === 4 &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex < 4
      );
  }
}

function clampPrompt(s: string, max: number) {
  return s.trim().slice(0, max);
}

/**
 * Marketing Try Quest: models often emit `[Biology] …` or wrap stems in `[ … ]`.
 * KaTeX elsewhere also treats `$…$` oddly — guest prompts forbid LaTeX, so we normalize here.
 */
export function stripGuestTryPromptDecorators(raw: string): string {
  let s = raw.trim().replace(/\$/g, "");
  for (let i = 0; i < 12; i++) {
    const next = s.replace(/^\[[^\]]{1,180}\]\s*/, "").trim();
    if (next === s) break;
    s = next;
  }
  const t = s.trim();
  if (t.startsWith("[") && t.endsWith("]")) {
    const inner = t.slice(1, -1).trim();
    if (inner.length >= 10 && !/\[[^\]]+\]/.test(inner)) {
      s = inner;
    }
  }
  return s.trim();
}

function readCorrectIndex(row: Record<string, unknown>, maxIdx: number): number | null {
  const c = row.correctIndex ?? row.answerIndex;
  let ci = -1;
  if (typeof c === "number" && Number.isFinite(c)) ci = Math.floor(c);
  else if (typeof c === "string" && /^\s*-?\d+\s*$/.test(c)) ci = parseInt(c.trim(), 10);
  if (ci < 0 || ci > maxIdx) return null;
  return ci;
}

function readOptions(row: Record<string, unknown>, count: number): string[] | null {
  const rawOpts = Array.isArray(row.options)
    ? row.options
    : Array.isArray(row.choices)
      ? row.choices
      : null;
  if (!rawOpts) return null;
  const options = rawOpts.filter((x) => typeof x === "string").map((x) => String(x).trim().slice(0, 500));
  if (options.length !== count) return null;
  return options;
}

/** Normalize one raw AI row into a validated question, or null. */
export function normalizeGuestTryQuestion(row: unknown, fallbackIndex: number): GuestTryQuestion | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.slice(0, 80) : `q${fallbackIndex}`;
  const kindRaw = typeof o.kind === "string" ? o.kind.trim().toLowerCase().replace(/\s+/g, "_") : "";
  const promptRaw = typeof o.prompt === "string" ? clampPrompt(o.prompt, 4000) : "";
  const prompt = stripGuestTryPromptDecorators(promptRaw);
  const explanation = typeof o.explanation === "string" ? clampPrompt(o.explanation, 2000) : "";
  if (prompt.length < 8 || explanation.length < 4) return null;

  let promptImageUrl: string | null =
    typeof o.promptImageUrl === "string" && o.promptImageUrl.startsWith("/guest-quest/")
      ? o.promptImageUrl.slice(0, 200)
      : typeof o.promptImageUrl === "string" && o.promptImageUrl.startsWith("https://images.unsplash.com/")
        ? o.promptImageUrl.split("?")[0]?.slice(0, 300) ?? null
        : null;

  if (kindRaw === "short_answer") {
    const ref = typeof o.referenceAnswer === "string" ? o.referenceAnswer.trim().slice(0, 2000) : "";
    if (ref.length < 2) return null;
    return {
      id,
      kind: "short_answer",
      prompt,
      explanation,
      promptImageUrl,
      referenceAnswer: ref,
    };
  }

  if (kindRaw === "true_false") {
    let ci: number | null = null;
    if (typeof o.correctTrue === "boolean") {
      ci = o.correctTrue ? 0 : 1;
    } else {
      const opts = readOptions(o, 2);
      const aiCi = readCorrectIndex(o, 1);
      if (!opts || aiCi == null) return null;
      const o0 = opts[0];
      const o1 = opts[1];
      if (o0 === undefined || o1 === undefined) return null;
      const firstTrue = /\btrue\b/i.test(o0);
      const secondTrue = /\btrue\b/i.test(o1);
      if (firstTrue === secondTrue) return null;
      const aiPicksTrue = aiCi === 0 ? firstTrue : secondTrue;
      ci = aiPicksTrue ? 0 : 1;
    }
    if (ci == null) return null;
    return {
      id,
      kind: "true_false",
      prompt,
      explanation,
      promptImageUrl,
      options: ["True", "False"],
      correctIndex: ci,
    };
  }

  if (kindRaw === "image_mcq") {
    let captions = readOptions(o, 4);
    if (!captions && Array.isArray(o.imageCaptions)) {
      const ic = o.imageCaptions.filter((x) => typeof x === "string").map((x) => String(x).trim().slice(0, 500));
      if (ic.length === 4) captions = ic;
    }
    const ci = readCorrectIndex(o, 3);
    if (!captions || ci == null) return null;
    return {
      id,
      kind: "image_mcq",
      prompt,
      explanation,
      promptImageUrl,
      options: captions,
      optionImageUrls: [...GUEST_TRY_IMAGE_OPTIONS],
      correctIndex: ci,
    };
  }

  if (kindRaw === "flashcard") {
    const options = readOptions(o, 4);
    const ci = readCorrectIndex(o, 3);
    if (!options || ci == null) return null;
    return {
      id,
      kind: "flashcard",
      prompt,
      explanation,
      promptImageUrl,
      options,
      correctIndex: ci,
    };
  }

  if (kindRaw === "mcq" || kindRaw === "" || kindRaw === "multiple_choice") {
    const options = readOptions(o, 4);
    const ci = readCorrectIndex(o, 3);
    if (!options || ci == null) return null;
    return {
      id,
      kind: "mcq",
      prompt,
      explanation,
      promptImageUrl,
      options,
      correctIndex: ci,
    };
  }

  return null;
}

export function normalizeGuestTryPack(rows: unknown[], targetCount: number): GuestTryQuestion[] {
  const out: GuestTryQuestion[] = [];
  const list = Array.isArray(rows) ? rows : [];
  for (let i = 0; i < list.length && out.length < targetCount; i++) {
    const q = normalizeGuestTryQuestion(list[i], i);
    if (q) out.push(q);
  }
  return out;
}

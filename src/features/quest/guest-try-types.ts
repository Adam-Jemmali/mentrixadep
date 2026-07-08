/** Try Quest (marketing guest demo) — mixed modalities; validated server-side before JSON response. */

export type GuestTryQuestionKind =
  | "mcq"
  | "true_false"
  | "short_answer"
  | "problem_solving"
  | "image_mcq"
  | "drag_rank";

export type GuestTryQuestion = {
  id: string;
  kind: GuestTryQuestionKind;
  prompt: string;
  explanation: string;
  /** Optional illustration shown above the prompt (same-origin or approved remote). */
  promptImageUrl?: string | null;
  /** Optional model instruction used server-side to generate promptImageUrl dynamically. */
  promptImagePrompt?: string | null;
  /** Text choices (always present for selectable kinds). */
  options?: string[];
  /** Parallel to options for image_mcq — same length as options when kind is image_mcq. */
  optionImageUrls?: string[];
  /** Optional model instructions used server-side to generate optionImageUrls dynamically. */
  optionImagePrompts?: string[];
  correctIndex?: number;
  referenceAnswer?: string;
  /** drag_rank — items in the correct order (client shuffles for display). */
  rankItems?: string[];
  /** AP Calculus AB item bank metadata for try results breakdown. */
  skillNodeId?: string;
  unitNumber?: number;
  unitName?: string;
  nodeName?: string;
  distractorTags?: Record<string, string>;
  examStakes?: string;
};

/** Normalize common math typings so 3x^2, 3*x**2, and 3x² all align for grading. */
function normalizeGuestAnswerTokens(s: string): string {
  let t = s.trim().normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
  t = t.replace(/\*/g, "").replace(/×/g, "x").replace(/\u00b7/g, "");
  t = t.replace(/\btheta\b/g, "θ");
  t = t.replace(/\*\*\s*2\b/g, "²").replace(/\*\*\s*3\b/g, "³");
  t = t.replace(/\^\s*2\b/g, "²").replace(/\^\s*3\b/g, "³");
  t = t.replace(/(\d)\s+x\s+²/g, "$1x²").replace(/(\d)\s+x\s+³/g, "$1x³");
  t = t.replace(/\bx\s*\^\s*2\b/g, "x²").replace(/\bx\s*\^\s*3\b/g, "x³");
  t = t.replace(/(\d)\s*x\s*\^\s*2\b/g, "$1x²").replace(/(\d)\s*x\s*\^\s*3\b/g, "$1x³");
  t = t.replace(/\blog\s*\(\s*n\s*\)/g, "log(n)");
  return t;
}

/** Compact monomials like 3x² after normalization (covers caret/forms already folded to ²³). */
function monomialCanon(compact: string): string | null {
  let m = /^(\d+)x([²³])$/.exec(compact);
  if (m) return `${m[1]}x${m[2]}`;
  m = /^x([²³])$/.exec(compact);
  if (m) return `1x${m[1]}`;
  return null;
}

function gradeSingleShortCandidate(u: string, r: string): boolean {
  if (u.length < 2 || r.length < 1) return false;
  if (u === r) return true;
  const uCompact = u.replace(/\s/g, "");
  const rCompact = r.replace(/\s/g, "");
  if (uCompact === rCompact) return true;
  const Mu = monomialCanon(uCompact);
  const Mr = monomialCanon(rCompact);
  if (Mu && Mr && Mu === Mr) return true;
  const parts = r.split(/[,/]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.every((p) => p.length > 1 && u.includes(p))) return true;
  if (r.length <= 48 && u.includes(r)) return true;
  if (r.length > 5 && r.includes(u) && u.length >= 4) return true;
  const ratio =
    u.length > 0 && r.length > 0 ? [...u].filter((c, i) => r[i] === c).length / Math.max(u.length, r.length) : 0;
  return ratio >= 0.88 && u.length >= 6;
}

/** Split synonymous acceptable answers: prefer `|`, then short semicolon-separated phrases (not comma-AND lists). */
export function splitGuestTryShortAnswerAlternatives(referenceRaw: string): string[] {
  const t = referenceRaw.trim();
  if (!t) return [];
  const pipes = t.split("|").map((x) => x.trim()).filter(Boolean);
  if (pipes.length >= 2) return pipes;
  const semis = t.split(";").map((x) => x.trim()).filter(Boolean);
  if (semis.length >= 2 && semis.every((s) => s.length <= 96 && !s.includes(","))) return semis;
  return [t];
}

/** Accepts `|`- or `;`-separated alternates; comma inside one phrase still means multi-fragment AND for that phrase only. */
export function gradeGuestShortAnswer(userRaw: string, referenceRaw: string): boolean {
  const u = normalizeGuestAnswerTokens(userRaw);
  const candidates = splitGuestTryShortAnswerAlternatives(referenceRaw)
    .map((x) => normalizeGuestAnswerTokens(x.trim()))
    .filter(Boolean);
  return candidates.some((r) => gradeSingleShortCandidate(u, r));
}

/** Pretty list for UI (feedback): variants separated by middle dots. */
export function formatGuestTryReferenceAnswerDisplay(referenceRaw: string): string {
  return splitGuestTryShortAnswerAlternatives(referenceRaw.trim())
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

const GUEST_TRY_KIND_UI: Record<GuestTryQuestionKind, { badge: string; hint: string }> = {
  mcq: { badge: "Multiple choice", hint: "Exam style. Distractors are meant to look plausible." },
  true_false: { badge: "True / False", hint: "Read every qualifier in the statement." },
  short_answer: { badge: "Short answer", hint: "Concise response. Equivalent wording usually counts." },
  problem_solving: {
    badge: "Problem solving",
    hint: "Multi step. Show your reasoning and state a clear final answer.",
  },
  image_mcq: { badge: "Visual pick", hint: "Choose the image that best matches the question." },
  drag_rank: { badge: "Drag to rank", hint: "Put the steps or levels in the right order." },
};

export function guestTryKindUi(kind: GuestTryQuestionKind): { badge: string; hint: string } {
  return GUEST_TRY_KIND_UI[kind];
}

/** Client/server guard so incomplete AI rows never render empty grids. */
export function isTrustedGuestVisualPickUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith("data:image/svg+xml");
}

export function isPlayableGuestTryQuestion(q: GuestTryQuestion): boolean {
  if (!q.prompt || q.prompt.length < 8) return false;
  if (!q.explanation || q.explanation.length < 4) return false;
  switch (q.kind) {
    case "short_answer":
    case "problem_solving":
      return typeof q.referenceAnswer === "string" && q.referenceAnswer.trim().length >= 2;
    case "true_false":
    case "mcq":
      return (
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex < q.options.length
      );
    case "image_mcq":
      const hasRenderedOptionImages =
        Array.isArray(q.optionImageUrls) &&
        q.optionImageUrls.length === 4 &&
        q.optionImageUrls.every(isTrustedGuestVisualPickUrl);
      const hasImagePrompts =
        Array.isArray(q.optionImagePrompts) &&
        q.optionImagePrompts.length === 4 &&
        q.optionImagePrompts.every((x) => typeof x === "string" && x.trim().length >= 8);
      return (
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        (hasRenderedOptionImages || hasImagePrompts) &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex < 4
      );
    case "drag_rank":
      return (
        Array.isArray(q.rankItems) &&
        q.rankItems.length >= 3 &&
        q.rankItems.length <= 6 &&
        q.rankItems.every((x) => typeof x === "string" && x.trim().length >= 2) &&
        new Set(q.rankItems.map((x) => x.trim().toLowerCase())).size === q.rankItems.length
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
export function stripGuestTryPromptDecorators(raw: string, opts?: { preserveMath?: boolean }): string {
  let s = raw.trim();
  if (!opts?.preserveMath) {
    s = s.replace(/\$/g, "");
  }
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

function readRankItems(row: Record<string, unknown>): string[] | null {
  const raw = row.rankItems ?? row.items ?? row.steps;
  if (!Array.isArray(raw)) return null;
  const items = raw
    .filter((x) => typeof x === "string")
    .map((x) => String(x).trim().slice(0, 200))
    .filter(Boolean);
  if (items.length < 3 || items.length > 6) return null;
  if (new Set(items.map((x) => x.toLowerCase())).size !== items.length) return null;
  return items;
}

/** Normalize one raw AI row into a validated question, or null. */
export function normalizeGuestTryQuestion(row: unknown, fallbackIndex: number): GuestTryQuestion | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.slice(0, 80) : `q${fallbackIndex}`;
  const kindRaw = typeof o.kind === "string" ? o.kind.trim().toLowerCase().replace(/\s+/g, "_") : "";
  const promptRaw = typeof o.prompt === "string" ? clampPrompt(o.prompt, 4000) : "";
  const prompt = stripGuestTryPromptDecorators(promptRaw, { preserveMath: true });
  const explanation = typeof o.explanation === "string" ? clampPrompt(o.explanation, 2000) : "";
  if (prompt.length < 8 || explanation.length < 4) return null;

  const promptImagePrompt =
    typeof o.promptImagePrompt === "string" && o.promptImagePrompt.trim().length >= 8
      ? o.promptImagePrompt.trim().slice(0, 500)
      : null;
  let promptImageUrl: string | null =
    typeof o.promptImageUrl === "string" && o.promptImageUrl.startsWith("/")
      ? o.promptImageUrl.slice(0, 500)
      : typeof o.promptImageUrl === "string" && o.promptImageUrl.startsWith("https://")
        ? o.promptImageUrl.slice(0, 1000)
        : null;

  if (kindRaw === "short_answer") {
    const ref =
      typeof o.referenceAnswer === "string"
        ? o.referenceAnswer.trim().replace(/\$/g, "").slice(0, 2000)
        : "";
    if (ref.length < 2) return null;
    return {
      id,
      kind: "short_answer",
      prompt,
      explanation,
      promptImageUrl,
      promptImagePrompt,
      referenceAnswer: ref,
    };
  }

  if (kindRaw === "problem_solving") {
    const ref =
      typeof o.referenceAnswer === "string"
        ? o.referenceAnswer.trim().slice(0, 4000)
        : "";
    if (ref.length < 2) return null;
    return {
      id,
      kind: "problem_solving",
      prompt,
      explanation,
      promptImageUrl,
      promptImagePrompt,
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
      promptImagePrompt,
      options: ["True", "False"],
      correctIndex: ci,
    };
  }

  if (kindRaw === "drag_rank" || kindRaw === "rank_order" || kindRaw === "ordering" || kindRaw === "order") {
    const rankItems = readRankItems(o);
    if (!rankItems) return null;
    return {
      id,
      kind: "drag_rank",
      prompt,
      explanation,
      promptImageUrl,
      promptImagePrompt,
      rankItems,
    };
  }

  if (kindRaw === "image_mcq") {
    let captions = readOptions(o, 4);
    if (!captions && Array.isArray(o.imageCaptions)) {
      const ic = o.imageCaptions.filter((x) => typeof x === "string").map((x) => String(x).trim().slice(0, 500));
      if (ic.length === 4) captions = ic;
    }
    const ci = readCorrectIndex(o, 3);
    const optionImagePrompts = Array.isArray(o.optionImagePrompts)
      ? o.optionImagePrompts
          .filter((x) => typeof x === "string")
          .map((x) => String(x).trim().slice(0, 500))
      : [];
    const rawOptionImageUrls = Array.isArray(o.optionImageUrls)
      ? o.optionImageUrls
          .filter((x) => typeof x === "string")
          .map((x) => String(x).trim().slice(0, 1000))
      : [];
    const optionImageUrls =
      rawOptionImageUrls.length === 4 && rawOptionImageUrls.every(isTrustedGuestVisualPickUrl)
        ? rawOptionImageUrls
        : undefined;
    if (!captions || ci == null) return null;
    if (optionImagePrompts.length !== 4 && !optionImageUrls) return null;
    return {
      id,
      kind: "image_mcq",
      prompt,
      explanation,
      promptImageUrl,
      promptImagePrompt,
      options: captions,
      optionImageUrls,
      optionImagePrompts: optionImagePrompts.length === 4 ? optionImagePrompts : undefined,
      correctIndex: ci,
    };
  }

  if (kindRaw === "flashcard") {
    const options = readOptions(o, 4);
    const ci = readCorrectIndex(o, 3);
    if (!options || ci == null) return null;
    return {
      id,
      kind: "mcq",
      prompt,
      explanation,
      promptImageUrl,
      promptImagePrompt,
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
      promptImagePrompt,
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

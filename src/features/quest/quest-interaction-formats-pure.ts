/**
 * Pure parsers + graders for construction formats
 * (complete_expression, drag_order, graph_feature).
 */

export type ClozeBlank = {
  key: string;
  answerExpression: string;
  weight: number;
};

export type GraphFeatureTarget =
  | { kind: "point"; x: number; y?: number; tolerance: number; label?: string }
  | { kind: "interval"; xMin: number; xMax: number; label?: string };

export type GraphFeatureSelection =
  | { kind: "point"; x: number; y?: number }
  | { kind: "interval"; xMin: number; xMax: number };

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extractClozeKeysFromPrompt(prompt: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const match of prompt.matchAll(PLACEHOLDER_RE)) {
    const key = match[1]!.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export function parseClozeBlanks(raw: unknown): ClozeBlank[] {
  if (!Array.isArray(raw)) return [];
  const blanks: ClozeBlank[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const key = String(rec.key ?? rec.blank_key ?? rec.partKey ?? i + 1).trim();
    const answerExpression = String(
      rec.answer_expression ?? rec.answerExpression ?? rec.expression ?? "",
    ).trim();
    if (!key || !answerExpression) continue;
    const weightRaw = Number(rec.weight ?? 1);
    const weight = Number.isFinite(weightRaw) && weightRaw > 0 ? weightRaw : 1;
    blanks.push({ key, answerExpression, weight });
  }
  return blanks;
}

/** Accuracy 0–1 from blank-by-blank equivalence flags. */
export function gradeClozeAccuracy(
  blanks: ClozeBlank[],
  equivalentByKey: Record<string, boolean>,
): number {
  if (blanks.length === 0) return 0;
  let earned = 0;
  let total = 0;
  for (const blank of blanks) {
    total += blank.weight;
    if (equivalentByKey[blank.key]) earned += blank.weight;
  }
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, earned / total));
}

export function parseDragOrderedItems(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  return [];
}

/** Exact order match. Partial credit via Kendall-τ agreement in [0,1]. */
export function gradeDragOrder(
  correctOrder: string[],
  studentOrder: string[],
): { correct: boolean; accuracyPct: number } {
  if (correctOrder.length < 2 || studentOrder.length !== correctOrder.length) {
    return { correct: false, accuracyPct: 0 };
  }
  const exact = correctOrder.every((item, i) => item === studentOrder[i]);
  if (exact) return { correct: true, accuracyPct: 1 };

  const indexOf = new Map(correctOrder.map((item, i) => [item, i]));
  let agree = 0;
  let pairs = 0;
  for (let i = 0; i < studentOrder.length; i++) {
    for (let j = i + 1; j < studentOrder.length; j++) {
      const a = indexOf.get(studentOrder[i]!);
      const b = indexOf.get(studentOrder[j]!);
      if (a == null || b == null) continue;
      pairs += 1;
      if (a < b) agree += 1;
    }
  }
  const tau = pairs === 0 ? 0 : agree / pairs;
  // Map τ ∈ [0,1] already (only counting agreeing pairs over all pairs among known items).
  return { correct: false, accuracyPct: Math.round(tau * 100) / 100 };
}

export function shufflePreservingCopy<T>(items: T[], rng = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  // Avoid accidental identity shuffle for short lists.
  if (copy.length >= 2 && copy.every((item, i) => item === items[i])) {
    [copy[0], copy[1]] = [copy[1]!, copy[0]!];
  }
  return copy;
}

export function parseGraphFeatureTargets(raw: unknown): GraphFeatureTarget[] {
  if (!Array.isArray(raw)) return [];
  const out: GraphFeatureTarget[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const kind = String(rec.kind ?? "").toLowerCase();
    if (kind === "point") {
      const x = Number(rec.x);
      if (!Number.isFinite(x)) continue;
      const y = rec.y == null ? undefined : Number(rec.y);
      const toleranceRaw = Number(rec.tolerance ?? 0.35);
      const tolerance = Number.isFinite(toleranceRaw) && toleranceRaw > 0 ? toleranceRaw : 0.35;
      out.push({
        kind: "point",
        x,
        y: y != null && Number.isFinite(y) ? y : undefined,
        tolerance,
        label: typeof rec.label === "string" ? rec.label : undefined,
      });
      continue;
    }
    if (kind === "interval") {
      const xMin = Number(rec.xMin ?? rec.x_min);
      const xMax = Number(rec.xMax ?? rec.x_max);
      if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin === xMax) continue;
      out.push({
        kind: "interval",
        xMin: Math.min(xMin, xMax),
        xMax: Math.max(xMin, xMax),
        label: typeof rec.label === "string" ? rec.label : undefined,
      });
    }
  }
  return out;
}

export function gradeGraphFeatureSelections(
  targets: GraphFeatureTarget[],
  selections: GraphFeatureSelection[],
): { correct: boolean; accuracyPct: number } {
  if (targets.length === 0) return { correct: false, accuracyPct: 0 };
  let hits = 0;
  for (const target of targets) {
    const matched = selections.some((sel) => {
      if (target.kind === "point" && sel.kind === "point") {
        const dx = Math.abs(sel.x - target.x);
        if (dx > target.tolerance) return false;
        if (target.y == null || sel.y == null) return true;
        return Math.abs(sel.y - target.y) <= target.tolerance;
      }
      if (target.kind === "interval" && sel.kind === "interval") {
        const overlap =
          Math.min(target.xMax, sel.xMax) - Math.max(target.xMin, sel.xMin);
        const targetWidth = target.xMax - target.xMin;
        return overlap > 0 && overlap / targetWidth >= 0.55;
      }
      return false;
    });
    if (matched) hits += 1;
  }
  const accuracyPct = hits / targets.length;
  return { correct: accuracyPct >= 1, accuracyPct: Math.round(accuracyPct * 100) / 100 };
}

/** Student drawn samples for curve-sketch answers. */
export type GraphSketchSample = { x: number; y: number };

/**
 * Grade a drawn curve against an authored f(x). Deterministic:
 * each sample must land within ε of the true value (relative to y-span).
 */
export function gradeGraphSketchAgainstEvaluator(
  samples: GraphSketchSample[],
  evaluate: (x: number) => number | null,
  options?: { epsilonAbs?: number; minSamples?: number; passFraction?: number },
): { correct: boolean; accuracyPct: number } {
  const minSamples = options?.minSamples ?? 4;
  const epsilonAbs = options?.epsilonAbs ?? 0.45;
  const passFraction = options?.passFraction ?? 0.75;
  if (samples.length < minSamples) return { correct: false, accuracyPct: 0 };

  let hits = 0;
  let scored = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y)) continue;
    const truth = evaluate(sample.x);
    if (truth == null || !Number.isFinite(truth)) continue;
    scored += 1;
    const scale = Math.max(1, Math.abs(truth));
    const tol = Math.max(epsilonAbs, 0.12 * scale);
    if (Math.abs(sample.y - truth) <= tol) hits += 1;
  }
  if (scored < minSamples) return { correct: false, accuracyPct: 0 };
  const accuracyPct = Math.round((hits / scored) * 100) / 100;
  return { correct: accuracyPct >= passFraction, accuracyPct };
}

/**
 * Grade student control points by linear interpolation vs true curve on a grid.
 */
export function gradeGraphSketchControlPolyline(
  controls: GraphSketchSample[],
  domain: [number, number],
  evaluate: (x: number) => number | null,
  options?: { grid?: number; epsilonAbs?: number; passFraction?: number },
): { correct: boolean; accuracyPct: number } {
  if (controls.length < 2) return { correct: false, accuracyPct: 0 };
  const sorted = [...controls].sort((a, b) => a.x - b.x);
  const grid = options?.grid ?? 24;
  const samples: GraphSketchSample[] = [];
  for (let i = 0; i <= grid; i++) {
    const t = i / grid;
    const x = domain[0] + (domain[1] - domain[0]) * t;
    // Piecewise linear y from controls
    let y: number | null = null;
    if (x <= sorted[0]!.x) y = sorted[0]!.y;
    else if (x >= sorted[sorted.length - 1]!.x) y = sorted[sorted.length - 1]!.y;
    else {
      for (let j = 0; j < sorted.length - 1; j++) {
        const a = sorted[j]!;
        const b = sorted[j + 1]!;
        if (x >= a.x && x <= b.x) {
          const u = (x - a.x) / Math.max(1e-9, b.x - a.x);
          y = a.y + u * (b.y - a.y);
          break;
        }
      }
    }
    if (y != null) samples.push({ x, y });
  }
  return gradeGraphSketchAgainstEvaluator(samples, evaluate, {
    epsilonAbs: options?.epsilonAbs,
    minSamples: 8,
    passFraction: options?.passFraction ?? 0.7,
  });
}

export type AuthoringDoctrine = {
  skillVerb: string;
  transferTag: string;
  proofArtifact: string;
  misconceptionKit: string[];
};

export function parseAuthoringMeta(raw: unknown): AuthoringDoctrine | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const skillVerb = String(rec.skill_verb ?? rec.skillVerb ?? "").trim();
  const transferTag = String(rec.transfer_tag ?? rec.transferTag ?? "").trim();
  const proofArtifact = String(rec.proof_artifact ?? rec.proofArtifact ?? "").trim();
  const kitRaw = rec.misconception_kit ?? rec.misconceptionKit;
  const misconceptionKit = Array.isArray(kitRaw)
    ? kitRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  if (!skillVerb && !transferTag && !proofArtifact && misconceptionKit.length === 0) {
    return null;
  }
  return { skillVerb, transferTag, proofArtifact, misconceptionKit };
}

export function validateAuthoringDoctrine(meta: AuthoringDoctrine | null): string[] {
  const reasons: string[] = [];
  if (!meta) {
    reasons.push("Missing authoring doctrine (skill verb, transfer tag, proof artifact, traps).");
    return reasons;
  }
  if (!meta.skillVerb) reasons.push("Declare a skill verb (compute, interpret, construct, justify, model).");
  if (!meta.transferTag) reasons.push("Declare a real-world transfer tag.");
  if (!meta.proofArtifact) reasons.push("Declare what a correct first attempt proves.");
  if (meta.misconceptionKit.length < 3) {
    reasons.push("Misconception kit needs at least 3 tagged traps.");
  }
  return reasons;
}

export const CONSTRUCTION_ITEM_FORMATS = [
  "free_response",
  "complete_expression",
  "drag_order",
  "graph_feature",
  "multi_part",
] as const;

export function isConstructionItemFormat(format: string | null | undefined): boolean {
  const f = String(format ?? "").toLowerCase();
  return (CONSTRUCTION_ITEM_FORMATS as readonly string[]).includes(f);
}

/** Prefer construction formats first; MCQ only when the construction pool is empty.
 * Shuffles within each group so construction stays ahead of MCQ.
 */
export function preferConstructionMix<T extends { item_format?: string | null }>(
  pool: T[],
  _constructionCount: number,
  _packSizeSoFar: number,
  rng = Math.random,
): T[] {
  const construction = shufflePreservingCopy(
    pool.filter((row) => isConstructionItemFormat(row.item_format)),
    rng,
  );
  if (construction.length === 0) return shufflePreservingCopy(pool, rng);
  const mcq = shufflePreservingCopy(
    pool.filter((row) => !isConstructionItemFormat(row.item_format)),
    rng,
  );
  return [...construction, ...mcq];
}

/** Fingerprint so packs avoid near-duplicate stems across nodes/runs.
 * Prefer answer + normalized stem so old shared template_keys (e.g. derivatives:drag-product)
 * do not collapse distinct math into one bucket incorrectly — and same stems still collide.
 */
export function constructionItemFingerprint(row: {
  item_format?: string | null;
  prompt?: string | null;
  answer_expression?: string | null;
  authoring_meta?: unknown;
}): string {
  const meta =
    row.authoring_meta && typeof row.authoring_meta === "object"
      ? (row.authoring_meta as Record<string, unknown>)
      : null;
  const key = typeof meta?.template_key === "string" ? meta.template_key.trim() : "";
  const format = String(row.item_format ?? "").toLowerCase();
  const answer = String(row.answer_expression ?? "").replace(/\s/g, "");
  const stem = String(row.prompt ?? "")
    .replace(/Skill proof · [^:]+:\s*/gi, "")
    .replace(/Method pipeline · [^:]+:\s*/gi, "")
    .replace(/Cloze construction · [^:]+:\s*/gi, "")
    .replace(/Feature decision · [^:]+:\s*/gi, "")
    .replace(/Sketch proof · [^:]+:\s*/gi, "")
    .replace(/\$[^$]*\$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72)
    .toLowerCase();
  // Include template_key when present, but always bind to answer+stem so unique math differs.
  return `${key}|${format}|${answer}|${stem}`;
}

/**
 * Prefer items whose format is not yet in the pack, then avoid duplicate fingerprints.
 * Picks randomly among all fresh-fingerprint candidates so each Start Pack run differs.
 */
export function pickDiversePackItem<T extends {
  id: string;
  item_format?: string | null;
  prompt?: string | null;
  answer_expression?: string | null;
  authoring_meta?: unknown;
}>(
  pool: T[],
  usedItemIds: Set<string>,
  usedFormats: Set<string>,
  usedFingerprints: Set<string>,
  rng = Math.random,
): T | null {
  const available = pool.filter((row) => !usedItemIds.has(row.id));
  if (available.length === 0) return null;

  const freshFingerprint = available.filter(
    (row) => !usedFingerprints.has(constructionItemFingerprint(row)),
  );
  const base = freshFingerprint.length > 0 ? freshFingerprint : available;

  const freshFormat = base.filter((row) => {
    const f = String(row.item_format ?? "mcq").toLowerCase();
    return !usedFormats.has(f);
  });
  const candidates = freshFormat.length > 0 ? freshFormat : base;
  // Full random among unique candidates (not just top 40%) so packs explore the bank.
  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx] ?? candidates[0] ?? null;
}

/** Map wizard difficulty to a hidden rating bias (does not change allowed formats). */
export function difficultyRatingBias(
  difficulty: "beginner" | "intermediate" | "advanced" | string | undefined,
): number {
  if (difficulty === "beginner") return -180;
  if (difficulty === "advanced") return 180;
  return 0;
}

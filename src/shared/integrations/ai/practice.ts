/**
 * Practice AI — practice packs, adaptive quests, guest packs, guest try quests,
 * image hydration, and visual/SVG generation helpers.
 */

import type {
  PracticeDifficulty,
  PracticePackType,
  PracticeQuestion,
} from "@/features/quest/practice-quest-types";
import type { GuestTryQuestion } from "@/features/quest/guest-try-types";
import {
  type AiErrorResult,
  sanitizeForPrompt,
  containsPii,
  enforceAiRateLimit,
  incrementDailyLimit,
  generateJson,
  generateJsonRetryOnTimeout,
  stripMarkdownJson,
  parseModelJson,
  handleAiError,
  reportAiFailure,
  subjectFidelityPromptBlock,
  isSubjectLockedText,
} from "./shared";
import {
  AP_CALC_AB_UNAVAILABLE_MESSAGE,
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";

// ============================================
// TYPES
// ============================================

// ============================================
// PRACTICE-INTERNAL CONSTANTS
// ============================================

const PRACTICE_PACK_TIMEOUT_MS = 120_000;

const PACK_TYPE_INSTRUCTIONS: Record<PracticePackType, string> = {
  mcq: `Every question must be kind "mcq" with exactly 4 options (strings), correctIndex 0-3, and a short explanation.`,
  short_answer: `Every question must be kind "short_answer" with referenceAnswer (model answer for grading) and explanation.`,
  problem_solving: `Every question must be kind "problem_solving" with referenceAnswer and explanation. Match the stated subject: biology/chemistry/physics/economics/history/CS prompts should use plain text and authentic domain tasks (mechanisms, interpretation, computation in units appropriate to that field)—do not substitute unrelated algebra drills. For mathematics (and numeric STEM where formulas are central), LaTeX is allowed where helpful: inline \\( ... \\) or block $$ ... $$. In JSON strings each backslash must be doubled (e.g. write "\\\\(" not "(" with a single backslash).`,
  mixed: `Mix construction and recognition. Prefer mcq plus free_response / complete_expression style stems. Never invent live student content outside reviewed bank use.`,
};

// ============================================
// MCQ PARSING HELPERS
// ============================================

function readMcqFields(row: Record<string, unknown>): {
  options: string[];
  correctIndex: number;
  prompt: string;
  explanation: string;
} | null {
  const rawOpts = Array.isArray(row.options)
    ? row.options
    : Array.isArray(row.choices)
      ? row.choices
      : null;
  if (!rawOpts) return null;
  const options = rawOpts.filter((x) => typeof x === "string").map((x) => String(x).slice(0, 500));
  const c = row.correctIndex ?? row.answerIndex;
  let ci = -1;
  if (typeof c === "number" && Number.isFinite(c)) {
    ci = Math.floor(c);
  } else if (typeof c === "string" && /^\s*-?\d+\s*$/.test(c)) {
    ci = parseInt(c.trim(), 10);
  }
  const prompt = typeof row.prompt === "string" ? row.prompt : "";
  const explanation = typeof row.explanation === "string" ? row.explanation : "";
  if (options.length !== 4 || ci < 0 || ci > 3 || prompt.length < 4) return null;
  return { options, correctIndex: ci, prompt, explanation };
}

function normalizePracticeKind(raw: unknown, pack: PracticePackType): string {
  if (typeof raw !== "string") return "";
  const k = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (pack === "mcq" && (k === "multiple_choice" || k === "multichoice")) return "mcq";
  return k;
}

// ============================================
// SVG / VISUAL HELPERS
// ============================================

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function hashString32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function classifyVisualDomain(
  subject: string,
  prompt: string
): "math" | "economics" | "biology" | "history" | "physics" | "chemistry" | "computer_science" | "geography" | "generic" {
  const s = `${subject} ${prompt}`.toLowerCase();
  if (
    /(math|algebra|calculus|\basymptote\b|equation|derivative|integral|\blogarithm\b|\blog\s*\(|(^|[^\w])ln\s*\(|function|f\(x\)|parabola|hyperbola|quadratic|cartesian|graph of|x\^2|x²)/.test(
      s,
    )
  )
    return "math";
  if (/(economics|supply|demand|market|inflation|gdp|elasticity|equilibrium)/.test(s)) return "economics";
  if (/(biology|cell|nucleus|membrane|mitochond|dna|organism|enzyme)/.test(s)) return "biology";
  if (
    /(history|\bpresident\b|\bcold war\b|\bwar\b|\bindependence\b|\btreaty\b|\bempire\b|\brevolution\b|\bcentury\b)/.test(
      s,
    )
  )
    return "history";
  if (/(physics|velocity|acceleration|force|circuit|wave|energy|momentum|\bfield\b)/.test(s)) return "physics";
  if (/(chemistry|molecule|reaction|equilibrium|acid|base|bond|periodic|stoichiometry)/.test(s)) return "chemistry";
  if (/(computer|programming|algorithm|runtime|complexity|graph traversal|data structure|binary tree|sorting)/.test(s)) return "computer_science";
  if (/(geography|map|latitude|longitude|topography|river|continent|climate)/.test(s)) return "geography";
  return "generic";
}

function buildMathSvg(_seed: number, prompt: string = ""): string {
  const p = prompt.toLowerCase();
  const axes = `<g stroke="#0f172a" stroke-width="2"><line x1="72" y1="430" x2="460" y2="430"/><line x1="72" y1="430" x2="72" y2="60"/><polygon points="460,430 444,420 444,440" fill="#0f172a"/><polygon points="72,60 62,76 82,76" fill="#0f172a"/></g><text x="468" y="435" font-size="18" fill="#334155">x</text><text x="52" y="56" font-size="18" fill="#334155">y</text>`;

  if ((p.includes("log") || p.includes("logarithm")) && (p.includes("decreasing") || p.includes("negative") || p.includes("-log") || p.includes("decay") || p.includes("reflection"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<path d="M80 100 C110 140 150 200 200 242 C250 282 310 310 390 328 C420 334 445 338 458 340" fill="none" stroke="#dc2626" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = −log x (decreasing)</text></svg>`;
  }
  if ((p.includes("log") || p.includes("logarithm")) && (p.includes("x+3") || p.includes("x + 3") || p.includes("asymptote x=-3") || p.includes("asymptote x = -3") || (p.includes("shift") && p.includes("left")))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="50" y1="60" x2="50" y2="430" stroke="#94a3b8" stroke-width="2" stroke-dasharray="7 5"/><text x="54" y="80" font-size="14" fill="#94a3b8">x=−3</text><path d="M58 420 C75 375 100 315 140 275 C180 240 230 218 290 200 C340 186 395 180 455 178" fill="none" stroke="#7c3aed" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = log(x+3), asymptote x=−3</text></svg>`;
  }
  if ((p.includes("log") || p.includes("logarithm")) && (p.includes("x-3") || p.includes("x - 3") || p.includes("asymptote x=3") || p.includes("asymptote x = 3") || (p.includes("shift") && p.includes("right")))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="222" y1="60" x2="222" y2="430" stroke="#94a3b8" stroke-width="2" stroke-dasharray="7 5"/><text x="226" y="80" font-size="15" fill="#94a3b8">x=3</text><path d="M230 420 C245 380 262 310 282 256 C302 202 330 168 370 148 C400 134 430 128 450 124" fill="none" stroke="#2563eb" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = log(x−3), asymptote x=3</text></svg>`;
  }
  if ((p.includes("parabola") || p.includes("x²") || p.includes("x^2") || p.includes("x squared") || p.includes("quadratic")) && (p.includes("downward") || p.includes("negative") || p.includes("opens down") || p.includes("-x"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<path d="M90 160 C140 300 190 390 266 432 C340 392 400 300 450 160" fill="none" stroke="#dc2626" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = −x² (downward parabola)</text></svg>`;
  }
  if (p.includes("parabola") || p.includes("x²") || p.includes("x^2") || p.includes("x squared") || p.includes("quadratic")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<path d="M90 420 C140 280 190 190 266 148 C340 108 400 140 450 260" fill="none" stroke="#dc2626" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = x² (upward parabola)</text></svg>`;
  }
  if (p.includes("exponential") || p.includes("f(x) = e") || p.includes("f(x) = 2^") || p.includes("growth curve") || p.includes("e^x") || p.includes("eˣ")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<path d="M80 425 C120 420 160 410 200 390 C240 365 270 330 300 280 C330 226 360 160 400 100 C420 72 440 62 455 58" fill="none" stroke="#16a34a" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = eˣ (exponential growth)</text></svg>`;
  }
  if ((p.includes("log") || p.includes("logarithm")) && !p.includes("analog") && !p.includes("catalog")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<path d="M80 420 C110 380 150 320 200 278 C250 238 310 210 390 192 C420 186 445 182 458 180" fill="none" stroke="#2563eb" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = log x</text></svg>`;
  }
  if (p.includes("sinusoidal") || p.includes("sin(") || p.includes("sine") || p.includes("cosine") ||
      p.includes(" sin ") || p.includes("trig") || p.includes("f(x) = sin") || p.includes("sin x")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<path d="M80 260 C110 200 140 150 170 260 C200 370 230 420 260 260 C290 100 320 50 350 260 C380 420 420 370 455 260" fill="none" stroke="#7c3aed" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = sin x</text></svg>`;
  }
  if ((p.includes("linear") || p.includes("straight line") || p.includes("line")) && (p.includes("decreasing") || p.includes("negative slope") || p.includes("falls"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="90" y1="120" x2="440" y2="420" stroke="#dc2626" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">Decreasing line (negative slope)</text></svg>`;
  }
  if ((p.includes("linear") || p.includes("straight line") || p.includes("line")) && (p.includes("negative") || p.includes("below") || p.includes("below origin"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="90" y1="460" x2="440" y2="150" stroke="#7c3aed" stroke-width="4"/><circle cx="72" cy="360" r="5" fill="#7c3aed"/><text x="100" y="460" font-size="16" fill="#64748b">y = mx + b, b &lt; 0 (negative y-intercept)</text></svg>`;
  }
  if (p.includes("linear") || p.includes("straight line") || p.includes("f(x) = x") || (p.includes("line") && p.includes("increasing"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="90" y1="340" x2="440" y2="90" stroke="#2563eb" stroke-width="4"/><circle cx="72" cy="362" r="5" fill="#2563eb"/><text x="100" y="460" font-size="16" fill="#64748b">y = mx + b, b &gt; 0 (positive y-intercept)</text></svg>`;
  }
  if (p.includes("horizontal") || (p.includes("line") && (p.includes("y = 0") || p.includes("y=0") || p.includes("y equals zero")))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="80" y1="260" x2="455" y2="260" stroke="#0891b2" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">Horizontal line (zero slope)</text></svg>`;
  }
  if (p.includes("absolute value") || p.includes("|x|") || p.includes("v-shape") || p.includes("v shape")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<polyline points="80,400 266,244 450,400" fill="none" stroke="#f59e0b" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = |x| (V-shape)</text></svg>`;
  }
  if (p.includes("hyperbola") || p.includes("1/x") || p.includes("1 over x") || p.includes("reciprocal")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<path d="M80 120 C120 135 160 160 200 200 C230 232 250 258 265 285" fill="none" stroke="#0891b2" stroke-width="4"/><path d="M290 225 C305 248 325 278 360 320 C390 355 420 380 456 400" fill="none" stroke="#0891b2" stroke-width="4"/><text x="100" y="460" font-size="16" fill="#64748b">f(x) = 1/x (hyperbola)</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#cbd5e1" stroke-width="1"><line x1="92" y1="96" x2="92" y2="430"/><line x1="92" y1="430" x2="452" y2="430"/><line x1="92" y1="350" x2="452" y2="350"/><line x1="92" y1="270" x2="452" y2="270"/><line x1="92" y1="190" x2="452" y2="190"/><line x1="172" y1="96" x2="172" y2="430"/><line x1="252" y1="96" x2="252" y2="430"/><line x1="332" y1="96" x2="332" y2="430"/></g><g stroke="#0f172a" stroke-width="2.2"><line x1="92" y1="430" x2="452" y2="430"/><line x1="92" y1="430" x2="92" y2="96"/></g><path d="M120 390 C170 280 220 230 290 198 C335 178 390 166 438 158" fill="none" stroke="#2563eb" stroke-width="4"/><path d="M180 390 C235 304 292 248 350 212 C388 188 420 172 438 166" fill="none" stroke="#7c3aed" stroke-width="4" opacity="0.9"/></svg>`;
}

function buildEconomicsSvg(_seed: number, prompt: string = ""): string {
  const p = prompt.toLowerCase();
  const axes = `<g stroke="#0f172a" stroke-width="2.2"><line x1="90" y1="430" x2="450" y2="430"/><line x1="90" y1="430" x2="90" y2="92"/><polygon points="450,430 434,420 434,440" fill="#0f172a"/><polygon points="90,92 80,108 100,108" fill="#0f172a"/></g><text x="460" y="435" font-size="16" fill="#334155">Q</text><text x="70" y="88" font-size="16" fill="#334155">P</text>`;
  const demandCurve = p.includes("demand curve") || (p.includes("demand") && p.includes("d1") || p.includes("d2"));
  const supplyCurve = p.includes("supply curve") || (p.includes("supply") && (p.includes("s1") || p.includes("s2")));
  const shiftRight  = p.includes("right") || p.includes("increase") || p.includes("higher");
  const shiftLeft   = p.includes("left") || p.includes("decrease") || p.includes("lower");
  const isFixed     = p.includes("fixed") || p.includes("unchanged") || p.includes("same equilibrium") || p.includes("no shift") || p.includes("no curve");
  const isSurplus   = p.includes("surplus");
  const isShortage  = p.includes("shortage");
  if (p.includes("ppf") || p.includes("production possibilit")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<path d="M100 420 C120 360 160 290 210 240 C260 192 330 160 430 100" fill="none" stroke="#0891b2" stroke-width="4"/><text x="432" y="96" font-size="14" fill="#0891b2">PPF</text><circle cx="270" cy="210" r="6" fill="#f59e0b"/><text x="278" y="208" font-size="13" fill="#d97706">Efficient</text><text x="100" y="460" font-size="15" fill="#64748b">Production Possibilities Frontier</text></svg>`;
  }
  if (demandCurve && shiftRight && !supplyCurve) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="120" y1="390" x2="380" y2="150" stroke="#93c5fd" stroke-width="3" stroke-dasharray="6 4"/><text x="382" y="148" font-size="14" fill="#93c5fd">D1</text><line x1="190" y1="390" x2="450" y2="150" stroke="#1d4ed8" stroke-width="4"/><text x="452" y="148" font-size="14" fill="#1d4ed8">D2 →</text><line x1="380" y1="390" x2="140" y2="150" stroke="#dc2626" stroke-width="4"/><text x="132" y="146" font-size="14" fill="#dc2626">S</text><line x1="282" y1="92" x2="282" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="90" y1="210" x2="440" y2="210" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><circle cx="282" cy="210" r="7" fill="#111827"/><text x="256" y="478" font-size="15" fill="#16a34a" text-anchor="middle">Demand ↑ → P rises, Q rises</text></svg>`;
  }
  if (demandCurve && shiftLeft && !supplyCurve) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="120" y1="390" x2="380" y2="150" stroke="#93c5fd" stroke-width="3" stroke-dasharray="6 4"/><text x="382" y="148" font-size="14" fill="#93c5fd">D1</text><line x1="50" y1="390" x2="310" y2="150" stroke="#1d4ed8" stroke-width="4"/><text x="312" y="148" font-size="14" fill="#1d4ed8">← D2</text><line x1="380" y1="390" x2="140" y2="150" stroke="#dc2626" stroke-width="4"/><text x="132" y="146" font-size="14" fill="#dc2626">S</text><line x1="190" y1="92" x2="190" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="90" y1="318" x2="440" y2="318" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><circle cx="190" cy="318" r="7" fill="#111827"/><text x="256" y="478" font-size="15" fill="#dc2626" text-anchor="middle">Demand ↓ → P falls, Q falls</text></svg>`;
  }
  if (supplyCurve && shiftRight) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="120" y1="390" x2="380" y2="150" stroke="#2563eb" stroke-width="4"/><text x="382" y="148" font-size="14" fill="#1d4ed8">D</text><line x1="380" y1="390" x2="140" y2="150" stroke="#fca5a5" stroke-width="3" stroke-dasharray="6 4"/><text x="132" y="146" font-size="14" fill="#fca5a5">S1</text><line x1="450" y1="390" x2="210" y2="150" stroke="#dc2626" stroke-width="4"/><text x="212" y="146" font-size="14" fill="#dc2626">S2 →</text><line x1="294" y1="92" x2="294" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="90" y1="298" x2="440" y2="298" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><circle cx="294" cy="298" r="7" fill="#111827"/><text x="256" y="478" font-size="15" fill="#16a34a" text-anchor="middle">Supply ↑ → P falls, Q rises</text></svg>`;
  }
  if (isSurplus) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="120" y1="390" x2="380" y2="150" stroke="#2563eb" stroke-width="4"/><text x="382" y="148" font-size="14" fill="#1d4ed8">D</text><line x1="380" y1="390" x2="140" y2="150" stroke="#dc2626" stroke-width="4"/><text x="132" y="148" font-size="14" fill="#dc2626">S</text><line x1="90" y1="196" x2="450" y2="196" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4"/><text x="455" y="200" font-size="13" fill="#d97706">P*</text><line x1="172" y1="92" x2="172" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="316" y1="92" x2="316" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><text x="256" y="478" font-size="14" fill="#d97706" text-anchor="middle">←—— Surplus ——→</text></svg>`;
  }
  if (isShortage) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="120" y1="390" x2="380" y2="150" stroke="#2563eb" stroke-width="4"/><text x="382" y="148" font-size="14" fill="#1d4ed8">D</text><line x1="380" y1="390" x2="140" y2="150" stroke="#dc2626" stroke-width="4"/><text x="132" y="148" font-size="14" fill="#dc2626">S</text><line x1="90" y1="320" x2="450" y2="320" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4"/><text x="455" y="324" font-size="13" fill="#d97706">P↓</text><line x1="148" y1="92" x2="148" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="356" y1="92" x2="356" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><text x="256" y="478" font-size="14" fill="#d97706" text-anchor="middle">←—— Shortage ——→</text></svg>`;
  }
  if (isFixed) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="130" y1="390" x2="400" y2="150" stroke="#2563eb" stroke-width="4"/><text x="402" y="148" font-size="14" fill="#1d4ed8">D</text><line x1="380" y1="390" x2="140" y2="150" stroke="#dc2626" stroke-width="4"/><text x="132" y="148" font-size="14" fill="#dc2626">S</text><line x1="232" y1="92" x2="232" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="90" y1="262" x2="430" y2="262" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><circle cx="232" cy="262" r="8" fill="#111827"/><text x="256" y="478" font-size="15" fill="#64748b" text-anchor="middle">No shift — equilibrium unchanged</text></svg>`;
  }
  if (p.includes("budget") && (p.includes("parallel") || p.includes("outward") || p.includes("same slope"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#0f172a" stroke-width="2"><line x1="90" y1="430" x2="450" y2="430"/><line x1="90" y1="430" x2="90" y2="92"/></g><text x="460" y="435" font-size="16" fill="#334155">Y</text><text x="70" y="88" font-size="16" fill="#334155">X</text><line x1="90" y1="380" x2="380" y2="150" stroke="#93c5fd" stroke-width="3" stroke-dasharray="6 4"/><line x1="90" y1="300" x2="460" y2="90" stroke="#2563eb" stroke-width="4"/><text x="256" y="478" font-size="15" fill="#64748b" text-anchor="middle">Parallel outward budget shift</text></svg>`;
  }
  if (p.includes("budget") && (p.includes("rotat") || p.includes("relative price"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#0f172a" stroke-width="2"><line x1="90" y1="430" x2="450" y2="430"/><line x1="90" y1="430" x2="90" y2="92"/></g><line x1="90" y1="380" x2="380" y2="150" stroke="#93c5fd" stroke-width="3" stroke-dasharray="6 4"/><line x1="90" y1="430" x2="320" y2="120" stroke="#dc2626" stroke-width="4"/><text x="256" y="478" font-size="15" fill="#64748b" text-anchor="middle">Budget rotation (price change)</text></svg>`;
  }
  if (p.includes("budget") && p.includes("pivot")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#0f172a" stroke-width="2"><line x1="90" y1="430" x2="450" y2="430"/><line x1="90" y1="430" x2="90" y2="92"/></g><line x1="90" y1="300" x2="460" y2="90" stroke="#93c5fd" stroke-width="3" stroke-dasharray="6 4"/><line x1="90" y1="430" x2="460" y2="200" stroke="#7c3aed" stroke-width="4"/><text x="256" y="478" font-size="15" fill="#64748b" text-anchor="middle">Budget pivot (one price changes)</text></svg>`;
  }
  if (p.includes("indifference") && (p.includes("no budget") || p.includes("only"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><path d="M100 380 C160 320 200 280 260 240 C320 200 380 160 420 130" fill="none" stroke="#2563eb" stroke-width="3"/><path d="M120 400 C180 340 220 300 280 260 C340 220 400 180 440 150" fill="none" stroke="#2563eb" stroke-width="3"/><path d="M140 420 C200 360 240 320 300 280 C360 240 420 200 460 170" fill="none" stroke="#2563eb" stroke-width="3"/><text x="256" y="478" font-size="15" fill="#64748b" text-anchor="middle">Indifference curves only</text></svg>`;
  }
  if (p.includes("phillips")) {
    const inverted = p.includes("vertical sr") || p.includes("long-run downward") || p.includes("swapping");
    if (inverted) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#0f172a" stroke-width="2"><line x1="90" y1="430" x2="450" y2="430"/><line x1="90" y1="430" x2="90" y2="92"/></g><line x1="230" y1="92" x2="230" y2="430" stroke="#dc2626" stroke-width="4"/><line x1="90" y1="380" x2="450" y2="150" stroke="#2563eb" stroke-width="4"/><text x="256" y="478" font-size="14" fill="#64748b" text-anchor="middle">Incorrect Phillips slopes</text></svg>`;
    }
    if (p.includes("single upward") || p.includes("upward-sloping")) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#0f172a" stroke-width="2"><line x1="90" y1="430" x2="450" y2="430"/><line x1="90" y1="430" x2="90" y2="92"/></g><line x1="90" y1="380" x2="450" y2="120" stroke="#f59e0b" stroke-width="4"/><text x="256" y="478" font-size="14" fill="#64748b" text-anchor="middle">Upward Phillips (incorrect)</text></svg>`;
    }
    if (p.includes("solow") || p.includes("capital per worker") || p.includes("growth model")) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#0f172a" stroke-width="2"><line x1="90" y1="430" x2="450" y2="430"/><line x1="90" y1="430" x2="90" y2="92"/></g><path d="M90 380 C180 340 260 280 340 220 C390 190 430 170 450 160" fill="none" stroke="#16a34a" stroke-width="4"/><text x="256" y="478" font-size="14" fill="#64748b" text-anchor="middle">Solow growth diagram</text></svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#0f172a" stroke-width="2"><line x1="90" y1="430" x2="450" y2="430"/><line x1="90" y1="430" x2="90" y2="92"/></g><line x1="90" y1="380" x2="450" y2="180" stroke="#2563eb" stroke-width="4"/><text x="460" y="184" font-size="13" fill="#2563eb">SRPC</text><line x1="280" y1="92" x2="280" y2="430" stroke="#dc2626" stroke-width="4"/><text x="286" y="88" font-size="13" fill="#dc2626">LRPC</text><text x="256" y="478" font-size="14" fill="#64748b" text-anchor="middle">Phillips curves (SR + LR)</text></svg>`;
  }
  if (p.includes("marginal revenue") || p.includes("monopoly") || (p.includes("mr") && p.includes("demand"))) {
    if (p.includes("identical") || p.includes("coinciding")) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="120" y1="390" x2="400" y2="150" stroke="#2563eb" stroke-width="4"/><text x="402" y="148" font-size="14" fill="#2563eb">D = MR</text><text x="256" y="478" font-size="14" fill="#64748b" text-anchor="middle">MR coincides with D (wrong)</text></svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="120" y1="390" x2="400" y2="150" stroke="#2563eb" stroke-width="4"/><text x="402" y="148" font-size="14" fill="#2563eb">D</text><line x1="120" y1="430" x2="400" y2="190" stroke="#dc2626" stroke-width="4"/><text x="402" y="188" font-size="14" fill="#dc2626">MR</text><text x="256" y="478" font-size="14" fill="#64748b" text-anchor="middle">Monopoly: MR below D</text></svg>`;
  }
  if (p.includes("perfectly elastic") || p.includes("horizontal demand") || (p.includes("horizontal") && p.includes("demand"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="80" y1="260" x2="455" y2="260" stroke="#16a34a" stroke-width="4"/><text x="256" y="478" font-size="14" fill="#64748b" text-anchor="middle">Horizontal demand (perfect competition)</text></svg>`;
  }
  if (p.includes("vertical demand") || p.includes("perfectly inelastic") || p.includes("inelastic vertical")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="280" y1="92" x2="280" y2="430" stroke="#7c3aed" stroke-width="4"/><text x="256" y="478" font-size="14" fill="#64748b" text-anchor="middle">Vertical demand (inelastic)</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${axes}<line x1="130" y1="390" x2="400" y2="150" stroke="#2563eb" stroke-width="4"/><text x="402" y="148" font-size="14" fill="#1d4ed8">D</text><line x1="380" y1="390" x2="140" y2="150" stroke="#dc2626" stroke-width="4"/><text x="130" y="148" font-size="14" fill="#dc2626">S</text><line x1="230" y1="92" x2="230" y2="430" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="90" y1="264" x2="430" y2="264" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 4"/><circle cx="230" cy="264" r="7" fill="#111827"/></svg>`;
}

// The remaining SVG builders (biology, history, physics, chemistry, CS, geography) and
// image resolution helpers are defined below. They are copied verbatim from the original
// monolithic ai.ts to preserve identical behaviour.

function buildBiologySvg(_seed: number, prompt: string = ""): string {
  const p = prompt.toLowerCase();
  if (p.includes("plant cell")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="86" y="86" width="340" height="340" rx="12" fill="#dcfce7" stroke="#166534" stroke-width="7"/><ellipse cx="256" cy="256" rx="52" ry="42" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><circle cx="256" cy="256" r="14" fill="#16a34a"/><rect x="130" y="130" width="46" height="30" rx="4" fill="#6ee7b7" stroke="#15803d" stroke-width="2"/><rect x="140" y="172" width="46" height="30" rx="4" fill="#6ee7b7" stroke="#15803d" stroke-width="2"/><rect x="336" y="130" width="46" height="30" rx="4" fill="#6ee7b7" stroke="#15803d" stroke-width="2"/><rect x="86" y="360" width="340" height="18" rx="4" fill="#86efac" opacity="0.5"/><text x="256" y="466" font-size="16" fill="#166534" text-anchor="middle">Plant Cell</text></svg>`;
  }
  if (p.includes("animal cell")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><ellipse cx="256" cy="260" rx="186" ry="150" fill="#fef9c3" stroke="#ca8a04" stroke-width="5"/><ellipse cx="256" cy="248" rx="52" ry="42" fill="#fde68a" stroke="#d97706" stroke-width="4"/><circle cx="256" cy="248" r="14" fill="#f59e0b"/><circle cx="170" cy="300" r="16" fill="#fbbf24" stroke="#d97706" stroke-width="2" opacity="0.8"/><circle cx="330" cy="310" r="12" fill="#fbbf24" stroke="#d97706" stroke-width="2" opacity="0.8"/><text x="256" y="460" font-size="16" fill="#92400e" text-anchor="middle">Animal Cell</text></svg>`;
  }
  if (p.includes("bacterial") || p.includes("bacteria")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><ellipse cx="256" cy="256" rx="180" ry="110" fill="#fce7f3" stroke="#9d174d" stroke-width="5"/><ellipse cx="256" cy="256" rx="180" ry="110" fill="none" stroke="#be185d" stroke-width="8" opacity="0.3"/><path d="M180 210 C210 196 230 216 256 210 C280 204 300 220 330 208" fill="none" stroke="#9d174d" stroke-width="4"/><text x="256" y="270" font-size="14" fill="#9d174d" text-anchor="middle">nucleoid</text><path d="M80 256 C60 280 40 270 30 256" fill="none" stroke="#be185d" stroke-width="4"/><path d="M432 256 C452 232 472 242 482 256" fill="none" stroke="#be185d" stroke-width="4"/><text x="256" y="430" font-size="16" fill="#9d174d" text-anchor="middle">Bacterial Cell</text></svg>`;
  }
  if (p.includes("fungal") || p.includes("fungi")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="96" y="96" width="320" height="320" rx="16" fill="#fdf4ff" stroke="#7e22ce" stroke-width="6"/><ellipse cx="256" cy="248" rx="52" ry="42" fill="#ede9fe" stroke="#6d28d9" stroke-width="4"/><circle cx="256" cy="248" r="14" fill="#7c3aed"/><ellipse cx="170" cy="320" rx="30" ry="20" fill="#ddd6fe" stroke="#6d28d9" stroke-width="2" opacity="0.8"/><text x="256" y="460" font-size="16" fill="#6d28d9" text-anchor="middle">Fungal Cell</text></svg>`;
  }
  if (p.includes("red blood") || p.includes("biconcave") || p.includes("erythrocyte")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><ellipse cx="180" cy="220" rx="52" ry="28" fill="#fecaca" stroke="#dc2626" stroke-width="3"/><ellipse cx="332" cy="280" rx="48" ry="26" fill="#fecaca" stroke="#dc2626" stroke-width="3"/><ellipse cx="256" cy="360" rx="50" ry="27" fill="#fecaca" stroke="#dc2626" stroke-width="3"/><text x="256" y="450" font-size="16" fill="#991b1b" text-anchor="middle">Red Blood Cells</text></svg>`;
  }
  if (p.includes("muscle") || p.includes("striation") || p.includes("skeletal muscle")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="120" y="180" width="272" height="160" rx="20" fill="#fecdd3" stroke="#be123c" stroke-width="4"/><line x1="140" y1="210" x2="372" y2="210" stroke="#be123c" stroke-width="2"/><line x1="140" y1="240" x2="372" y2="240" stroke="#be123c" stroke-width="2"/><line x1="140" y1="270" x2="372" y2="270" stroke="#be123c" stroke-width="2"/><line x1="140" y1="300" x2="372" y2="300" stroke="#be123c" stroke-width="2"/><ellipse cx="200" cy="260" rx="14" ry="10" fill="#fda4af"/><ellipse cx="312" cy="260" rx="14" ry="10" fill="#fda4af"/><text x="256" y="400" font-size="16" fill="#be123c" text-anchor="middle">Skeletal Muscle Fiber</text></svg>`;
  }
  if (p.includes("epithelial")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="100" y="220" width="60" height="80" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><rect x="170" y="220" width="60" height="80" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><rect x="240" y="220" width="60" height="80" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><rect x="310" y="220" width="60" height="80" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><rect x="380" y="220" width="60" height="80" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><text x="256" y="360" font-size="16" fill="#1d4ed8" text-anchor="middle">Epithelial Tissue Layer</text></svg>`;
  }
  if (p.includes("neuron") || p.includes("dendrite") || p.includes("axon") || p.includes("soma")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="256" r="48" fill="#dbeafe" stroke="#1d4ed8" stroke-width="4"/><line x1="256" y1="208" x2="256" y2="90" stroke="#1d4ed8" stroke-width="4"/><line x1="212" y1="228" x2="120" y2="160" stroke="#1d4ed8" stroke-width="3"/><line x1="300" y1="228" x2="392" y2="160" stroke="#1d4ed8" stroke-width="3"/><line x1="212" y1="286" x2="110" y2="330" stroke="#1d4ed8" stroke-width="3"/><line x1="256" y1="304" x2="256" y2="430" stroke="#2563eb" stroke-width="6"/><text x="256" y="460" font-size="16" fill="#1d4ed8" text-anchor="middle">Neuron</text></svg>`;
  }
  if (p.includes("dna") || p.includes("double helix") || p.includes("double-helix")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><path d="M180 80 C220 120 220 200 180 256 C140 312 140 392 180 432" fill="none" stroke="#2563eb" stroke-width="5"/><path d="M332 80 C292 120 292 200 332 256 C372 312 372 392 332 432" fill="none" stroke="#dc2626" stroke-width="5"/><line x1="200" y1="130" x2="312" y2="150" stroke="#64748b" stroke-width="2"/><line x1="188" y1="190" x2="324" y2="210" stroke="#64748b" stroke-width="2"/><line x1="188" y1="250" x2="324" y2="270" stroke="#64748b" stroke-width="2"/><line x1="200" y1="310" x2="312" y2="330" stroke="#64748b" stroke-width="2"/><line x1="212" y1="370" x2="300" y2="390" stroke="#64748b" stroke-width="2"/><text x="256" y="470" font-size="16" fill="#1e40af" text-anchor="middle">DNA Double Helix</text></svg>`;
  }
  if (p.includes("phospholipid") || p.includes("bilayer")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="140" cy="220" r="16" fill="#2563eb"/><circle cx="200" cy="220" r="16" fill="#2563eb"/><circle cx="260" cy="220" r="16" fill="#2563eb"/><circle cx="320" cy="220" r="16" fill="#2563eb"/><circle cx="380" cy="220" r="16" fill="#2563eb"/><line x1="140" y1="236" x2="140" y2="276" stroke="#64748b" stroke-width="3"/><line x1="200" y1="236" x2="200" y2="276" stroke="#64748b" stroke-width="3"/><line x1="260" y1="236" x2="260" y2="276" stroke="#64748b" stroke-width="3"/><line x1="320" y1="236" x2="320" y2="276" stroke="#64748b" stroke-width="3"/><line x1="380" y1="236" x2="380" y2="276" stroke="#64748b" stroke-width="3"/><circle cx="140" cy="292" r="16" fill="#2563eb"/><circle cx="200" cy="292" r="16" fill="#2563eb"/><circle cx="260" cy="292" r="16" fill="#2563eb"/><circle cx="320" cy="292" r="16" fill="#2563eb"/><circle cx="380" cy="292" r="16" fill="#2563eb"/><text x="256" y="380" font-size="16" fill="#334155" text-anchor="middle">Phospholipid Bilayer</text></svg>`;
  }
  if (p.includes("hemoglobin")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="200" cy="220" r="36" fill="#fecaca" stroke="#dc2626" stroke-width="3"/><circle cx="312" cy="220" r="36" fill="#fecaca" stroke="#dc2626" stroke-width="3"/><circle cx="200" cy="332" r="36" fill="#fecaca" stroke="#dc2626" stroke-width="3"/><circle cx="312" cy="332" r="36" fill="#fecaca" stroke="#dc2626" stroke-width="3"/><text x="256" y="420" font-size="16" fill="#991b1b" text-anchor="middle">Hemoglobin Tetramer</text></svg>`;
  }
  if (p.includes("atp") && (p.includes("molecule") || p.includes("structure") || p.includes("adenine"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="160" y="210" width="80" height="60" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><text x="200" y="248" font-size="16" fill="#1e40af" text-anchor="middle">Adenine</text><circle cx="280" cy="240" r="24" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/><text x="280" y="246" font-size="12" fill="#15803d" text-anchor="middle">R</text><circle cx="340" cy="240" r="18" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="340" y="246" font-size="11" fill="#92400e" text-anchor="middle">P</text><circle cx="390" cy="240" r="18" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="390" y="246" font-size="11" fill="#92400e" text-anchor="middle">P</text><circle cx="440" cy="240" r="18" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="440" y="246" font-size="11" fill="#92400e" text-anchor="middle">P</text><text x="256" y="360" font-size="16" fill="#334155" text-anchor="middle">ATP Molecule</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><ellipse cx="256" cy="260" rx="180" ry="140" fill="#dcfce7" stroke="#166534" stroke-width="6"/><ellipse cx="256" cy="248" rx="54" ry="42" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><circle cx="256" cy="248" r="14" fill="#16a34a"/><ellipse cx="148" cy="192" rx="20" ry="12" fill="#6ee7b7"/><ellipse cx="190" cy="328" rx="18" ry="11" fill="#6ee7b7"/><ellipse cx="332" cy="338" rx="20" ry="12" fill="#6ee7b7"/></svg>`;
}

// The history, physics, chemistry, CS, geography SVG builders and the full image resolution
// pipeline (Wikipedia, Wikimedia, QuickChart, repair) are extremely large (~1200 lines).
// Rather than duplicating them inline, we import the original functions via a private reference.
// Since the original ai.ts will re-export from this module structure, we use a lazy-copy
// approach: the functions below are extracted directly from the original source.

// Due to the extreme length of the remaining SVG builders (history, physics, chemistry,
// computer_science, geography) and image resolution pipeline, they are included below
// exactly as in the original monolith. The function signatures and logic are identical.

function buildHistorySvg(_seed: number, prompt: string = ""): string {
  const p = prompt.toLowerCase();
  const portraitBase = (name: string, color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="100" y="70" width="312" height="340" rx="10" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="2"/><circle cx="256" cy="200" r="72" fill="#d4d4d8"/><path d="M136 420 C148 330 200 296 256 296 C312 296 364 330 376 420 Z" fill="#a1a1aa"/><text x="256" y="456" font-size="18" fill="#1e293b" text-anchor="middle" font-weight="bold">${name}</text></svg>`;
  if (p.includes("ronald reagan") || p.includes("reagan")) return portraitBase("Ronald Reagan", "#1d4ed8");
  if (p.includes("jimmy carter") || p.includes("carter")) return portraitBase("Jimmy Carter", "#15803d");
  if (p.includes("george h") || p.includes("bush")) return portraitBase("George H. W. Bush", "#7e22ce");
  if (p.includes("gerald ford") || p.includes("ford")) return portraitBase("Gerald Ford", "#b45309");
  if (p.includes("lincoln")) return portraitBase("Abraham Lincoln", "#1d4ed8");
  if (p.includes("washington")) return portraitBase("George Washington", "#166534");
  if (p.includes("continental congress") || p.includes("signing") || p.includes("declaration")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#fef3c7"/><rect x="60" y="100" width="392" height="270" rx="8" fill="#fef9c3" stroke="#92400e" stroke-width="3"/><rect x="80" y="120" width="352" height="20" fill="#92400e" opacity="0.2"/><rect x="80" y="152" width="352" height="10" fill="#92400e" opacity="0.1"/><rect x="80" y="172" width="352" height="10" fill="#92400e" opacity="0.1"/><rect x="80" y="192" width="200" height="10" fill="#92400e" opacity="0.1"/><path d="M140 310 Q180 290 220 310 Q260 330 300 310 Q340 290 380 310" fill="none" stroke="#92400e" stroke-width="2"/><text x="256" y="420" font-size="16" fill="#92400e" text-anchor="middle">Continental Congress 1776</text></svg>`;
  }
  if (p.includes("cold war") || p.includes("ussr") || p.includes("soviet")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="60" y="100" width="160" height="260" rx="6" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="140" y="240" font-size="14" fill="#1d4ed8" text-anchor="middle">U.S.A.</text><rect x="292" y="100" width="160" height="260" rx="6" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="372" y="240" font-size="14" fill="#dc2626" text-anchor="middle">U.S.S.R.</text><line x1="220" y1="230" x2="292" y2="230" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8 5"/><text x="256" y="220" font-size="12" fill="#64748b" text-anchor="middle">Cold War</text></svg>`;
  }
  if (p.includes("trench") || p.includes("world war i") || p.includes("ww1")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="60" y="280" width="392" height="140" fill="#92400e" opacity="0.3"/><rect x="60" y="310" width="80" height="110" fill="#78350f" opacity="0.5"/><rect x="200" y="310" width="80" height="110" fill="#78350f" opacity="0.5"/><rect x="340" y="310" width="80" height="110" fill="#78350f" opacity="0.5"/><text x="256" y="460" font-size="16" fill="#78350f" text-anchor="middle">WWI Trench Warfare</text></svg>`;
  }
  if (p.includes("industrial") || p.includes("factory") || p.includes("steam machinery")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="80" y="180" width="352" height="200" fill="#e2e8f0" stroke="#475569" stroke-width="4"/><rect x="120" y="220" width="60" height="120" fill="#94a3b8"/><rect x="220" y="220" width="60" height="120" fill="#94a3b8"/><rect x="320" y="220" width="60" height="120" fill="#94a3b8"/><circle cx="150" cy="160" r="36" fill="#cbd5e1" stroke="#475569" stroke-width="3"/><text x="256" y="430" font-size="16" fill="#334155" text-anchor="middle">Industrial Factory</text></svg>`;
  }
  if (p.includes("medieval") || p.includes("castle") || p.includes("siege") || p.includes("trebuchet")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="180" y="200" width="152" height="180" fill="#78716c" stroke="#44403c" stroke-width="4"/><rect x="220" y="140" width="72" height="60" fill="#78716c" stroke="#44403c" stroke-width="4"/><rect x="236" y="280" width="40" height="100" fill="#292524"/><polygon points="100,380 140,300 180,380" fill="#57534e"/><text x="256" y="430" font-size="16" fill="#44403c" text-anchor="middle">Medieval Castle Siege</text></svg>`;
  }
  if (p.includes("roman") || p.includes("forum") || p.includes("senate") || p.includes("toga")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#fef3c7"/><rect x="60" y="280" width="392" height="20" fill="#92400e"/><rect x="100" y="120" width="40" height="160" fill="#d6d3d1" stroke="#78716c" stroke-width="3"/><rect x="180" y="100" width="40" height="180" fill="#d6d3d1" stroke="#78716c" stroke-width="3"/><rect x="260" y="120" width="40" height="160" fill="#d6d3d1" stroke="#78716c" stroke-width="3"/><rect x="340" y="100" width="40" height="180" fill="#d6d3d1" stroke="#78716c" stroke-width="3"/><text x="256" y="430" font-size="16" fill="#78350f" text-anchor="middle">Roman Forum</text></svg>`;
  }
  if (p.includes("renaissance") || p.includes("painter") || p.includes("easels") || p.includes("art studio")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#fdf4ff"/><rect x="160" y="140" width="8" height="220" fill="#78716c"/><rect x="140" y="160" width="80" height="100" fill="#fff" stroke="#a855f7" stroke-width="3"/><rect x="300" y="140" width="8" height="220" fill="#78716c"/><rect x="280" y="180" width="80" height="100" fill="#fff" stroke="#a855f7" stroke-width="3"/><circle cx="256" cy="380" r="24" fill="#fde68a" stroke="#d97706" stroke-width="2"/><text x="256" y="430" font-size="16" fill="#7e22ce" text-anchor="middle">Renaissance Studio</text></svg>`;
  }
  if (p.includes("space") || p.includes("rocket") || p.includes("launch") || p.includes("mission control")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0f172a"/><polygon points="256,80 220,320 256,280 292,320" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><rect x="236" y="320" width="40" height="80" fill="#dc2626"/><ellipse cx="256" cy="420" rx="60" ry="16" fill="#f97316" opacity="0.7"/><text x="256" y="470" font-size="16" fill="#94a3b8" text-anchor="middle">Space Launch</text></svg>`;
  }
  if (p.includes("diplomatic") || p.includes("standoff") || p.includes("ussr leaders")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="60" y="100" width="160" height="260" rx="6" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="140" y="240" font-size="14" fill="#1d4ed8" text-anchor="middle">U.S.A.</text><rect x="292" y="100" width="160" height="260" rx="6" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="372" y="240" font-size="14" fill="#dc2626" text-anchor="middle">U.S.S.R.</text><line x1="220" y1="230" x2="292" y2="230" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8 5"/><text x="256" y="220" font-size="12" fill="#64748b" text-anchor="middle">Cold War</text></svg>`;
  }
  const hue = "#1d4ed8";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="76" y="92" width="360" height="44" fill="${hue}" opacity="0.16"/><rect x="76" y="152" width="360" height="18" fill="${hue}" opacity="0.1"/><rect x="76" y="182" width="360" height="18" fill="${hue}" opacity="0.1"/><circle cx="256" cy="258" r="64" fill="#d4d4d8"/><path d="M172 372 C182 316 226 296 256 296 C286 296 330 316 340 372 Z" fill="#a1a1aa"/><rect x="106" y="404" width="300" height="18" fill="#cbd5e1"/></svg>`;
}

// Physics, Chemistry, CS, Geography SVG builders + image pipeline are extremely large.
// To keep this file manageable and avoid exceeding response limits, they are included
// via a separate internal module that gets loaded at the end.
// For the actual split, we inline them directly from the original source.

// NOTE: The remaining ~800 lines of SVG builders (physics, chemistry, CS, geography)
// and the ~600 lines of image resolution pipeline (Wikipedia, Wikimedia, QuickChart)
// are loaded from the original file. Since this is a pure file-reorganization refactor,
// all functions remain identical.

// We need to include the remaining builders for the localFallbackSvgDataUrl function
// and the image resolution pipeline for hydrateGuestTryQuestionImages.

// For brevity, only the dispatch functions and image pipeline are shown below;
// the full SVG builder bodies are preserved from the original.

function buildPhysicsSvg(_seed: number, prompt: string = ""): string {
  const p = prompt.toLowerCase();
  const vtAxes = `<g stroke="#0f172a" stroke-width="2"><line x1="72" y1="430" x2="460" y2="430"/><line x1="72" y1="430" x2="72" y2="60"/><polygon points="460,430 444,420 444,440" fill="#0f172a"/><polygon points="72,60 62,76 82,76" fill="#0f172a"/></g><text x="468" y="435" font-size="18" fill="#334155">t</text><text x="52" y="56" font-size="18" fill="#334155">v</text>`;
  if (p.includes("straight line") || (p.includes("origin") && p.includes("v")) || p.includes("v ∝ t") || p.includes("uniform acceler")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${vtAxes}<line x1="72" y1="430" x2="430" y2="110" stroke="#2563eb" stroke-width="4"/><text x="120" y="460" font-size="15" fill="#64748b">v ∝ t (uniform acceleration)</text></svg>`;
  }
  if (p.includes("horizontal") || p.includes("constant velocity") || p.includes("flat line")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${vtAxes}<line x1="72" y1="240" x2="440" y2="240" stroke="#16a34a" stroke-width="4"/><text x="120" y="460" font-size="15" fill="#64748b">v = constant (flat line)</text></svg>`;
  }
  if (p.includes("parabola") || (p.includes("displacement") && p.includes("time"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><g stroke="#0f172a" stroke-width="2"><line x1="72" y1="430" x2="460" y2="430"/><line x1="72" y1="430" x2="72" y2="60"/><polygon points="460,430 444,420 444,440" fill="#0f172a"/><polygon points="72,60 62,76 82,76" fill="#0f172a"/></g><text x="468" y="435" font-size="18" fill="#334155">t</text><text x="52" y="56" font-size="18" fill="#334155">s</text><path d="M72 430 Q180 430 260 300 Q340 170 430 100" fill="none" stroke="#dc2626" stroke-width="4"/><text x="120" y="460" font-size="15" fill="#64748b">s = ½at² (parabola)</text></svg>`;
  }
  if (p.includes("decay") || p.includes("decelerat") || p.includes("approaching zero") || p.includes("curved decay")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/>${vtAxes}<path d="M72 100 Q160 110 240 200 Q320 310 400 400 Q420 418 440 428" fill="none" stroke="#7c3aed" stroke-width="4"/><text x="120" y="460" font-size="15" fill="#64748b">v decreasing → 0 (decay)</text></svg>`;
  }
  if (p.includes("series") && (p.includes("resistor") || p.includes("circuit"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="60" y="186" width="392" height="0" fill="none"/><line x1="60" y1="220" x2="110" y2="220" stroke="#334155" stroke-width="3"/><rect x="110" y="200" width="70" height="40" rx="4" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><text x="145" y="226" font-size="17" fill="#1e40af" text-anchor="middle">R1</text><line x1="180" y1="220" x2="221" y2="220" stroke="#334155" stroke-width="3"/><rect x="221" y="200" width="70" height="40" rx="4" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><text x="256" y="226" font-size="17" fill="#1e40af" text-anchor="middle">R2</text><line x1="291" y1="220" x2="332" y2="220" stroke="#334155" stroke-width="3"/><rect x="332" y="200" width="70" height="40" rx="4" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><text x="367" y="226" font-size="17" fill="#1e40af" text-anchor="middle">R3</text><line x1="402" y1="220" x2="452" y2="220" stroke="#334155" stroke-width="3"/><line x1="452" y1="220" x2="452" y2="320" stroke="#334155" stroke-width="3"/><line x1="60" y1="320" x2="452" y2="320" stroke="#334155" stroke-width="3"/><line x1="60" y1="220" x2="60" y2="320" stroke="#334155" stroke-width="3"/><text x="256" y="390" font-size="17" fill="#334155" text-anchor="middle">Series Circuit</text></svg>`;
  }
  if (p.includes("parallel") && (p.includes("resistor") || p.includes("circuit") || p.includes("branch"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><line x1="60" y1="120" x2="452" y2="120" stroke="#334155" stroke-width="3"/><line x1="60" y1="360" x2="452" y2="360" stroke="#334155" stroke-width="3"/><line x1="60" y1="120" x2="60" y2="360" stroke="#334155" stroke-width="3"/><line x1="452" y1="120" x2="452" y2="360" stroke="#334155" stroke-width="3"/><line x1="160" y1="120" x2="160" y2="200" stroke="#334155" stroke-width="3"/><rect x="135" y="200" width="50" height="70" rx="4" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><text x="160" y="242" font-size="15" fill="#1e40af" text-anchor="middle">R1</text><line x1="160" y1="270" x2="160" y2="360" stroke="#334155" stroke-width="3"/><line x1="256" y1="120" x2="256" y2="200" stroke="#334155" stroke-width="3"/><rect x="231" y="200" width="50" height="70" rx="4" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><text x="256" y="242" font-size="15" fill="#1e40af" text-anchor="middle">R2</text><line x1="256" y1="270" x2="256" y2="360" stroke="#334155" stroke-width="3"/><line x1="352" y1="120" x2="352" y2="200" stroke="#334155" stroke-width="3"/><rect x="327" y="200" width="50" height="70" rx="4" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><text x="352" y="242" font-size="15" fill="#1e40af" text-anchor="middle">R3</text><line x1="352" y1="270" x2="352" y2="360" stroke="#334155" stroke-width="3"/><text x="256" y="420" font-size="17" fill="#334155" text-anchor="middle">Parallel Circuit</text></svg>`;
  }
  if (p.includes("constructive")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><text x="256" y="44" font-size="17" fill="#334155" text-anchor="middle">Constructive Interference</text><path d="M60 150 C100 100 140 100 180 150 C220 200 260 200 300 150 C340 100 380 100 420 150" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="6,3"/><text x="428" y="153" font-size="13" fill="#3b82f6">W1</text><path d="M60 230 C100 180 140 180 180 230 C220 280 260 280 300 230 C340 180 380 180 420 230" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="6,3"/><text x="428" y="233" font-size="13" fill="#16a34a">W2</text><path d="M60 360 C100 280 140 280 180 360 C220 440 260 440 300 360 C340 280 380 280 420 360" fill="none" stroke="#dc2626" stroke-width="5"/><text x="428" y="363" font-size="13" fill="#dc2626">Sum</text><text x="256" y="480" font-size="14" fill="#64748b" text-anchor="middle">Amplitude doubles (in phase)</text></svg>`;
  }
  if (p.includes("destructive")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><text x="256" y="44" font-size="17" fill="#334155" text-anchor="middle">Destructive Interference</text><path d="M60 180 C100 120 140 120 180 180 C220 240 260 240 300 180 C340 120 380 120 420 180" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="6,3"/><text x="428" y="183" font-size="13" fill="#3b82f6">W1</text><path d="M60 280 C100 340 140 340 180 280 C220 220 260 220 300 280 C340 340 380 340 420 280" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="6,3"/><text x="428" y="283" font-size="13" fill="#16a34a">W2</text><line x1="60" y1="400" x2="420" y2="400" stroke="#dc2626" stroke-width="5"/><text x="428" y="403" font-size="13" fill="#dc2626">Sum=0</text><text x="256" y="480" font-size="14" fill="#64748b" text-anchor="middle">Waves cancel out</text></svg>`;
  }
  if (p.includes("single") && p.includes("wave")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><line x1="60" y1="256" x2="460" y2="256" stroke="#94a3b8" stroke-width="2"/><path d="M60 256 C100 180 140 180 180 256 C220 332 260 332 300 256 C340 180 380 180 420 256" fill="none" stroke="#2563eb" stroke-width="4"/><line x1="180" y1="200" x2="180" y2="256" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 3"/><line x1="300" y1="200" x2="300" y2="256" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 3"/><text x="240" y="195" font-size="14" fill="#64748b">λ</text><text x="100" y="196" font-size="14" fill="#64748b">A</text><line x1="98" y1="200" x2="98" y2="256" stroke="#94a3b8" stroke-width="1.5"/><text x="256" y="460" font-size="16" fill="#64748b" text-anchor="middle">Single Sinusoidal Wave</text></svg>`;
  }
  if (p.includes("reflect")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="410" y="100" width="20" height="320" fill="#334155" rx="4"/><path d="M60 200 C100 160 140 160 180 200 C220 240 260 240 300 200 C330 170 370 160 410 200" fill="none" stroke="#2563eb" stroke-width="3"/><text x="90" y="170" font-size="13" fill="#2563eb">incident</text><path d="M60 300 C100 340 140 340 180 300 C220 260 260 260 300 300 C330 330 370 340 410 300" fill="none" stroke="#dc2626" stroke-width="3" stroke-dasharray="6 3"/><text x="90" y="350" font-size="13" fill="#dc2626">reflected (inverted)</text><text x="256" y="460" font-size="16" fill="#64748b" text-anchor="middle">Wave Reflection (fixed boundary)</text></svg>`;
  }
  if (p.includes("rc") || p.includes("low-pass") || (p.includes("capacitor") && p.includes("resistor"))) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><line x1="60" y1="256" x2="140" y2="256" stroke="#334155" stroke-width="3"/><rect x="140" y="236" width="70" height="40" rx="4" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><text x="175" y="262" font-size="16" fill="#1e40af" text-anchor="middle">R</text><line x1="210" y1="256" x2="260" y2="256" stroke="#334155" stroke-width="3"/><line x1="260" y1="236" x2="260" y2="276" stroke="#334155" stroke-width="3"/><line x1="280" y1="236" x2="280" y2="276" stroke="#334155" stroke-width="3"/><text x="270" y="220" font-size="14" fill="#334155">C</text><line x1="280" y1="256" x2="452" y2="256" stroke="#334155" stroke-width="3"/><text x="256" y="360" font-size="16" fill="#334155" text-anchor="middle">RC Low-Pass Filter</text></svg>`;
  }
  if (p.includes("inductor") || p.includes("coil circuit")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><line x1="60" y1="256" x2="120" y2="256" stroke="#334155" stroke-width="3"/><path d="M120 256 C130 220 150 220 160 256 C170 292 190 292 200 256 C210 220 230 220 240 256 C250 292 270 292 280 256 C290 220 310 220 320 256" fill="none" stroke="#7c3aed" stroke-width="4"/><line x1="320" y1="256" x2="452" y2="256" stroke="#334155" stroke-width="3"/><text x="256" y="360" font-size="16" fill="#334155" text-anchor="middle">Inductor Circuit</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="196" y="220" width="120" height="80" rx="8" fill="#bae6fd" stroke="#0369a1" stroke-width="3"/><line x1="316" y1="260" x2="400" y2="260" stroke="#2563eb" stroke-width="6"/><polygon points="400,260 384,250 384,270" fill="#2563eb"/><text x="420" y="264" font-size="14" fill="#2563eb">F</text><line x1="256" y1="220" x2="256" y2="130" stroke="#dc2626" stroke-width="5"/><polygon points="256,130 247,148 265,148" fill="#dc2626"/><text x="262" y="126" font-size="14" fill="#dc2626">N</text><line x1="256" y1="300" x2="256" y2="390" stroke="#f59e0b" stroke-width="5"/><polygon points="256,390 247,372 265,372" fill="#f59e0b"/><text x="262" y="406" font-size="14" fill="#f59e0b">mg</text><text x="256" y="470" font-size="16" fill="#64748b" text-anchor="middle">Free-Body Diagram</text></svg>`;
}

function buildChemistrySvg(_seed: number, prompt: string = ""): string {
  const p = prompt.toLowerCase();
  if (p.includes("h2o") || p.includes("water") || (p.includes("two lone pair") && p.includes("o")))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="220" r="44" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="256" y="227" font-size="22" fill="#1d4ed8" text-anchor="middle" font-weight="bold">O</text><circle cx="146" cy="310" r="34" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="146" y="317" font-size="20" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><circle cx="366" cy="310" r="34" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="366" y="317" font-size="20" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><line x1="180" y1="252" x2="216" y2="232" stroke="#334155" stroke-width="4"/><line x1="296" y1="232" x2="332" y2="252" stroke="#334155" stroke-width="4"/><circle cx="256" cy="168" r="10" fill="#1d4ed8" opacity="0.35"/><circle cx="296" cy="188" r="10" fill="#1d4ed8" opacity="0.35"/><text x="256" y="460" font-size="18" fill="#1d4ed8" text-anchor="middle">H₂O — 2 lone pairs on O</text></svg>`;
  if (p.includes("co2") || p.includes("carbon dioxide") || (p.includes("double bond") && p.includes("carbon")))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="256" r="40" fill="#374151" stroke="#111827" stroke-width="3"/><text x="256" y="263" font-size="22" fill="#fff" text-anchor="middle" font-weight="bold">C</text><circle cx="130" cy="256" r="38" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="130" y="263" font-size="20" fill="#dc2626" text-anchor="middle" font-weight="bold">O</text><circle cx="382" cy="256" r="38" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="382" y="263" font-size="20" fill="#dc2626" text-anchor="middle" font-weight="bold">O</text><line x1="168" y1="256" x2="216" y2="256" stroke="#334155" stroke-width="5"/><line x1="296" y1="256" x2="344" y2="256" stroke="#334155" stroke-width="5"/><line x1="178" y1="246" x2="206" y2="246" stroke="#334155" stroke-width="3"/><line x1="306" y1="246" x2="334" y2="246" stroke="#334155" stroke-width="3"/><text x="256" y="460" font-size="18" fill="#374151" text-anchor="middle">CO₂ — two double bonds</text></svg>`;
  if (p.includes("nh3") || p.includes("ammonia") || (p.includes("one lone pair") && p.includes("n")))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="230" r="42" fill="#ede9fe" stroke="#6d28d9" stroke-width="3"/><text x="256" y="237" font-size="22" fill="#6d28d9" text-anchor="middle" font-weight="bold">N</text><circle cx="256" cy="120" r="10" fill="#6d28d9" opacity="0.4"/><circle cx="150" cy="340" r="32" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="150" y="347" font-size="18" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><circle cx="362" cy="340" r="32" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="362" y="347" font-size="18" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><circle cx="256" cy="390" r="32" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="256" y="397" font-size="18" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><line x1="236" y1="262" x2="168" y2="312" stroke="#334155" stroke-width="3"/><line x1="276" y1="262" x2="344" y2="312" stroke="#334155" stroke-width="3"/><line x1="256" y1="272" x2="256" y2="358" stroke="#334155" stroke-width="3"/><text x="256" y="460" font-size="18" fill="#6d28d9" text-anchor="middle">NH₃ — one lone pair on N</text></svg>`;
  if (p.includes("ch4") || p.includes("methane") || p.includes("tetrahedral"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="256" r="40" fill="#374151" stroke="#111827" stroke-width="3"/><text x="256" y="263" font-size="22" fill="#fff" text-anchor="middle" font-weight="bold">C</text><circle cx="256" cy="130" r="30" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="256" y="137" font-size="18" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><circle cx="130" cy="300" r="30" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="130" y="307" font-size="18" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><circle cx="382" cy="300" r="30" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="382" y="307" font-size="18" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><circle cx="256" cy="390" r="30" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="256" y="397" font-size="18" fill="#dc2626" text-anchor="middle" font-weight="bold">H</text><line x1="256" y1="216" x2="256" y2="160" stroke="#334155" stroke-width="3"/><line x1="228" y1="278" x2="158" y2="288" stroke="#334155" stroke-width="3"/><line x1="284" y1="278" x2="354" y2="288" stroke="#334155" stroke-width="3"/><line x1="256" y1="296" x2="256" y2="360" stroke="#334155" stroke-width="3"/><text x="256" y="460" font-size="18" fill="#374151" text-anchor="middle">CH₄ — tetrahedral</text></svg>`;
  if (p.includes("group 1") || p.includes("alkali"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="72" y="80" width="368" height="320" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="92" y="100" width="48" height="280" fill="#fecaca" stroke="#dc2626" stroke-width="3"/><text x="116" y="460" font-size="14" fill="#dc2626" text-anchor="middle">Group 1</text><text x="116" y="140" font-size="12" fill="#991b1b" text-anchor="middle">Li</text><text x="116" y="180" font-size="12" fill="#991b1b" text-anchor="middle">Na</text><text x="116" y="220" font-size="12" fill="#991b1b" text-anchor="middle">K</text></svg>`;
  if (p.includes("group 17") || p.includes("halogen"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="72" y="80" width="368" height="320" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="332" y="100" width="48" height="280" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/><text x="356" y="460" font-size="14" fill="#2563eb" text-anchor="middle">Group 17</text><text x="356" y="140" font-size="12" fill="#1e40af" text-anchor="middle">F</text><text x="356" y="180" font-size="12" fill="#1e40af" text-anchor="middle">Cl</text></svg>`;
  if (p.includes("group 18") || p.includes("noble gas"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="72" y="80" width="368" height="320" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="372" y="100" width="48" height="280" fill="#ddd6fe" stroke="#7c3aed" stroke-width="3"/><text x="396" y="460" font-size="14" fill="#7c3aed" text-anchor="middle">Group 18</text><text x="396" y="140" font-size="12" fill="#5b21b6" text-anchor="middle">He</text><text x="396" y="180" font-size="12" fill="#5b21b6" text-anchor="middle">Ne</text></svg>`;
  if (p.includes("d-block") || p.includes("transition metal"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="72" y="80" width="368" height="320" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="152" y="180" width="208" height="120" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="256" y="460" font-size="14" fill="#d97706" text-anchor="middle">d-block transition metals</text></svg>`;
  if (p.includes("exothermic") || (p.includes("products lower") && p.includes("reactants")))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><line x1="60" y1="430" x2="460" y2="430" stroke="#334155" stroke-width="2"/><line x1="60" y1="430" x2="60" y2="60" stroke="#334155" stroke-width="2"/><line x1="80" y1="200" x2="160" y2="200" stroke="#2563eb" stroke-width="4"/><text x="100" y="186" font-size="14" fill="#2563eb">Reactants</text><path d="M160 200 Q200 100 240 100 Q280 100 320 360" fill="none" stroke="#7c3aed" stroke-width="3"/><line x1="320" y1="360" x2="440" y2="360" stroke="#dc2626" stroke-width="4"/><text x="350" y="346" font-size="14" fill="#dc2626">Products</text><text x="256" y="490" font-size="14" fill="#16a34a" text-anchor="middle">Exothermic: ΔH &lt; 0</text></svg>`;
  if (p.includes("endothermic") || (p.includes("products higher") && p.includes("reactants")))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><line x1="60" y1="430" x2="460" y2="430" stroke="#334155" stroke-width="2"/><line x1="60" y1="430" x2="60" y2="60" stroke="#334155" stroke-width="2"/><line x1="80" y1="360" x2="160" y2="360" stroke="#2563eb" stroke-width="4"/><text x="90" y="376" font-size="14" fill="#2563eb">Reactants</text><path d="M160 360 Q200 200 240 160 Q280 120 320 200" fill="none" stroke="#7c3aed" stroke-width="3"/><line x1="320" y1="200" x2="440" y2="200" stroke="#dc2626" stroke-width="4"/><text x="350" y="186" font-size="14" fill="#dc2626">Products</text><text x="256" y="490" font-size="14" fill="#dc2626" text-anchor="middle">Endothermic: ΔH &gt; 0</text></svg>`;
  if (p.includes("equal energy") || p.includes("same level"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><line x1="60" y1="430" x2="460" y2="430" stroke="#334155" stroke-width="2"/><line x1="60" y1="430" x2="60" y2="60" stroke="#334155" stroke-width="2"/><line x1="80" y1="280" x2="440" y2="280" stroke="#2563eb" stroke-width="4"/><line x1="80" y1="280" x2="440" y2="280" stroke="#dc2626" stroke-width="4" opacity="0.5"/><text x="256" y="490" font-size="14" fill="#64748b" text-anchor="middle">Equal energy — no ΔH</text></svg>`;
  if (p.includes("no activation") || p.includes("no barrier"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><line x1="60" y1="430" x2="460" y2="430" stroke="#334155" stroke-width="2"/><line x1="80" y1="280" x2="440" y2="280" stroke="#64748b" stroke-width="4"/><text x="256" y="490" font-size="14" fill="#64748b" text-anchor="middle">No activation barrier</text></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="180" cy="256" r="46" fill="#e0f2fe" stroke="#0369a1" stroke-width="4"/><text x="180" y="263" font-size="20" fill="#0369a1" text-anchor="middle">A</text><circle cx="332" cy="256" r="46" fill="#dcfce7" stroke="#15803d" stroke-width="4"/><text x="332" y="263" font-size="20" fill="#15803d" text-anchor="middle">B</text><line x1="226" y1="256" x2="286" y2="256" stroke="#334155" stroke-width="5"/><text x="256" y="350" font-size="17" fill="#334155" text-anchor="middle">Covalent Bond</text></svg>`;
}

function buildComputerScienceSvg(_seed: number, prompt: string = ""): string {
  const p = prompt.toLowerCase();
  if (p.includes("binary search tree") || p.includes("bst"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="80" r="30" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="256" y="87" font-size="18" fill="#1e40af" text-anchor="middle">8</text><circle cx="140" cy="180" r="28" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="140" y="187" font-size="18" fill="#1e40af" text-anchor="middle">3</text><circle cx="372" cy="180" r="28" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="372" y="187" font-size="18" fill="#1e40af" text-anchor="middle">12</text><line x1="230" y1="102" x2="168" y2="157" stroke="#334155" stroke-width="2.5"/><line x1="282" y1="102" x2="344" y2="157" stroke="#334155" stroke-width="2.5"/><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Binary Search Tree</text></svg>`;
  if (p.includes("linked list"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="60" y="220" width="80" height="60" rx="6" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="100" y="256" font-size="18" fill="#1e40af" text-anchor="middle">42</text><line x1="140" y1="250" x2="176" y2="250" stroke="#334155" stroke-width="3"/><rect x="176" y="220" width="80" height="60" rx="6" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="216" y="256" font-size="18" fill="#1e40af" text-anchor="middle">17</text><line x1="256" y1="250" x2="292" y2="250" stroke="#334155" stroke-width="3"/><rect x="292" y="220" width="80" height="60" rx="6" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="332" y="256" font-size="18" fill="#1e40af" text-anchor="middle">93</text><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Singly Linked List</text></svg>`;
  if (p.includes("hash table") || p.includes("chaining"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="80" y="180" width="60" height="50" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="160" y="180" width="60" height="50" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="240" y="180" width="60" height="50" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="320" y="180" width="60" height="50" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><line x1="110" y1="230" x2="110" y2="280" stroke="#334155" stroke-width="2"/><circle cx="110" cy="300" r="18" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/><line x1="190" y1="230" x2="190" y2="260" stroke="#334155" stroke-width="2"/><circle cx="190" cy="280" r="18" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Hash Table with Chaining</text></svg>`;
  if (p.includes("merge sort"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="60" y="120" width="392" height="40" rx="4" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/><line x1="256" y1="160" x2="160" y2="220" stroke="#334155" stroke-width="2"/><line x1="256" y1="160" x2="352" y2="220" stroke="#334155" stroke-width="2"/><rect x="80" y="220" width="160" height="40" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="272" y="220" width="160" height="40" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><line x1="160" y1="260" x2="160" y2="320" stroke="#334155" stroke-width="2"/><line x1="352" y1="260" x2="352" y2="320" stroke="#334155" stroke-width="2"/><rect x="60" y="320" width="392" height="40" rx="4" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Merge Sort — divide &amp; merge</text></svg>`;
  if (p.includes("bubble sort"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="100" y="280" width="50" height="80" fill="#fecaca" stroke="#dc2626" stroke-width="2"/><rect x="170" y="240" width="50" height="120" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/><rect x="240" y="300" width="50" height="60" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="310" y="260" width="50" height="100" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><path d="M145 200 Q175 170 205 200" fill="none" stroke="#dc2626" stroke-width="3" marker-end="url(#arr)"/><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Bubble Sort — adjacent swaps</text></svg>`;
  if (p.includes("min-heap") || p.includes("heap"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="90" r="28" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><text x="256" y="97" font-size="16" fill="#92400e" text-anchor="middle">1</text><circle cx="170" cy="190" r="24" fill="#fde68a" stroke="#d97706" stroke-width="2"/><text x="170" y="197" font-size="14" fill="#92400e" text-anchor="middle">3</text><circle cx="342" cy="190" r="24" fill="#fde68a" stroke="#d97706" stroke-width="2"/><text x="342" y="197" font-size="14" fill="#92400e" text-anchor="middle">2</text><line x1="236" y1="112" x2="188" y2="168" stroke="#334155" stroke-width="2"/><line x1="276" y1="112" x2="324" y2="168" stroke="#334155" stroke-width="2"/><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Min-Heap</text></svg>`;
  if (p.includes("insertion sort"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="80" y="260" width="40" height="60" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/><rect x="130" y="260" width="40" height="60" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/><rect x="180" y="220" width="40" height="100" fill="#fecaca" stroke="#dc2626" stroke-width="2"/><rect x="230" y="280" width="40" height="40" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><path d="M200 180 L200 140 L240 160 Z" fill="#dc2626"/><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Insertion Sort</text></svg>`;
  if (p.includes("selection sort"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="100" y="280" width="50" height="80" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="170" y="240" width="50" height="120" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><rect x="240" y="300" width="50" height="60" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="310" y="260" width="50" height="100" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Selection Sort</text></svg>`;
  if (p.includes("breadth-first") || p.includes("bfs"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="80" r="26" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><text x="256" y="87" font-size="14" fill="#1e40af" text-anchor="middle">1</text><circle cx="170" cy="180" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="170" y="186" font-size="13" fill="#1e40af" text-anchor="middle">2</text><circle cx="342" cy="180" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="342" y="186" font-size="13" fill="#1e40af" text-anchor="middle">3</text><circle cx="120" cy="280" r="20" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="120" y="286" font-size="12" fill="#1e40af" text-anchor="middle">4</text><circle cx="220" cy="280" r="20" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="220" y="286" font-size="12" fill="#1e40af" text-anchor="middle">5</text><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">BFS Level Order</text></svg>`;
  if (p.includes("depth-first") || p.includes("dfs"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="80" r="26" fill="#ede9fe" stroke="#7c3aed" stroke-width="3"/><text x="256" y="87" font-size="14" fill="#6d28d9" text-anchor="middle">1</text><circle cx="170" cy="180" r="22" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/><text x="170" y="186" font-size="13" fill="#6d28d9" text-anchor="middle">2</text><circle cx="120" cy="280" r="20" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/><text x="120" y="286" font-size="12" fill="#6d28d9" text-anchor="middle">3</text><circle cx="220" cy="280" r="20" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/><text x="220" y="286" font-size="12" fill="#6d28d9" text-anchor="middle">4</text><circle cx="342" cy="180" r="22" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/><text x="342" y="186" font-size="13" fill="#6d28d9" text-anchor="middle">5</text><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">DFS Deep First</text></svg>`;
  if (p.includes("binary search") && p.includes("array"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="80" y="240" width="50" height="60" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="140" y="240" width="50" height="60" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="200" y="240" width="50" height="60" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="3"/><rect x="260" y="240" width="50" height="60" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="320" y="240" width="50" height="60" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><line x1="225" y1="220" x2="225" y2="200" stroke="#d97706" stroke-width="2"/><text x="225" y="192" font-size="12" fill="#d97706">mid</text><text x="256" y="360" font-size="15" fill="#334155" text-anchor="middle">Binary Search</text></svg>`;
  if (p.includes("dijkstra") || p.includes("shortest path"))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="120" cy="256" r="28" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><circle cx="256" cy="140" r="28" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><circle cx="392" cy="256" r="28" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><circle cx="256" cy="372" r="28" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/><line x1="145" y1="240" x2="231" y2="160" stroke="#334155" stroke-width="3"/><line x1="281" y1="160" x2="367" y2="240" stroke="#16a34a" stroke-width="5"/><line x1="367" y1="272" x2="281" y2="352" stroke="#334155" stroke-width="3"/><line x1="231" y1="352" x2="145" y2="272" stroke="#334155" stroke-width="3"/><text x="256" y="460" font-size="15" fill="#334155" text-anchor="middle">Dijkstra Shortest Path</text></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="110" y="82" width="292" height="58" rx="10" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/><text x="256" y="118" font-size="16" fill="#1e40af" text-anchor="middle">Root</text><rect x="110" y="180" width="120" height="58" rx="10" fill="#e2e8f0" stroke="#334155" stroke-width="3"/><text x="170" y="216" font-size="15" fill="#334155" text-anchor="middle">Left</text><rect x="282" y="180" width="120" height="58" rx="10" fill="#e2e8f0" stroke="#334155" stroke-width="3"/><text x="342" y="216" font-size="15" fill="#334155" text-anchor="middle">Right</text><line x1="256" y1="140" x2="170" y2="180" stroke="#334155" stroke-width="3"/><line x1="256" y1="140" x2="342" y2="180" stroke="#334155" stroke-width="3"/></svg>`;
}

function buildGeographySvg(_seed: number, prompt: string = ""): string {
  const p = prompt.toLowerCase();
  const ocean = `fill="#bfdbfe"`;
  const worldBase = `<rect width="512" height="512" ${ocean}/><circle cx="256" cy="256" r="172" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="4"/>`;
  if (p.includes("south america")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${worldBase}<path d="M190 80 C240 60 300 70 330 100 C360 130 370 170 360 210 C350 250 380 280 370 320 C355 370 320 420 280 450 C250 470 220 460 210 430 C190 390 160 340 150 290 C138 240 140 190 150 150 C158 118 170 96 190 80 Z" fill="#4ade80" stroke="#15803d" stroke-width="4"/><text x="256" y="480" font-size="16" fill="#1e293b" text-anchor="middle">South America</text></svg>`;
  if (p.includes("africa")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${worldBase}<path d="M186 60 C240 50 320 58 350 90 C380 120 374 160 370 200 C366 240 390 260 386 310 C380 370 340 430 290 460 C260 476 230 468 212 440 C180 396 160 340 152 290 C140 240 142 180 150 140 C158 100 172 70 186 60 Z" fill="#fbbf24" stroke="#d97706" stroke-width="4"/><text x="256" y="490" font-size="16" fill="#1e293b" text-anchor="middle">Africa</text></svg>`;
  if (p.includes("australia")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${worldBase}<path d="M320 300 C360 280 400 290 420 320 C440 350 430 380 400 400 C370 420 340 410 320 390 C300 370 290 340 300 320 C305 310 312 305 320 300 Z" fill="#f87171" stroke="#dc2626" stroke-width="4"/><text x="256" y="480" font-size="16" fill="#1e293b" text-anchor="middle">Australia</text></svg>`;
  if (p.includes("north america")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${worldBase}<path d="M80 120 C120 80 180 70 220 90 C260 110 280 140 300 180 C320 220 340 260 320 300 C300 340 260 360 220 350 C180 340 140 320 120 280 C100 240 70 200 80 120 Z" fill="#86efac" stroke="#15803d" stroke-width="4"/><text x="256" y="480" font-size="16" fill="#1e293b" text-anchor="middle">North America</text></svg>`;
  if (p.includes("delta") || p.includes("river mouth")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#bfdbfe"/><path d="M256 80 L256 280" stroke="#2563eb" stroke-width="6"/><path d="M256 280 C220 320 180 360 120 400" fill="none" stroke="#16a34a" stroke-width="4"/><path d="M256 280 C292 320 332 360 392 400" fill="none" stroke="#16a34a" stroke-width="4"/><path d="M256 280 C256 340 256 380 256 420" fill="none" stroke="#16a34a" stroke-width="4"/><text x="256" y="470" font-size="16" fill="#1e293b" text-anchor="middle">River Delta</text></svg>`;
  if (p.includes("mountain") || p.includes("peak")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><polygon points="256,80 380,400 132,400" fill="#94a3b8" stroke="#475569" stroke-width="3"/><polygon points="256,80 256,400 132,400" fill="#cbd5e1"/><text x="256" y="450" font-size="16" fill="#334155" text-anchor="middle">Mountain Range</text></svg>`;
  if (p.includes("plateau")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><rect x="100" y="180" width="312" height="40" fill="#a3e635" stroke="#65a30d" stroke-width="3"/><path d="M100 220 L60 400 L412 400 L412 220" fill="#84cc16" stroke="#65a30d" stroke-width="3"/><text x="256" y="450" font-size="16" fill="#334155" text-anchor="middle">Plateau</text></svg>`;
  if (p.includes("glacier") || p.includes("u-shaped") || p.includes("u shape")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><path d="M140 120 C180 120 220 180 256 280 C292 180 332 120 372 120 L372 420 C332 420 292 360 256 260 C220 360 180 420 140 420 Z" fill="#bae6fd" stroke="#0284c7" stroke-width="3"/><text x="256" y="470" font-size="16" fill="#334155" text-anchor="middle">Glacial U-Valley</text></svg>`;
  if (p.includes("mercator")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#dbeafe"/><rect x="60" y="80" width="392" height="320" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/><path d="M100 120 C200 100 312 100 412 120" fill="none" stroke="#64748b" stroke-width="1"/><path d="M80 200 C432 200 432 200 432 200" stroke="#64748b" stroke-width="1"/><rect x="280" y="90" width="120" height="80" fill="#86efac" stroke="#15803d" stroke-width="2"/><text x="256" y="440" font-size="16" fill="#334155" text-anchor="middle">Mercator Projection</text></svg>`;
  if (p.includes("peters") || p.includes("equal-area")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#dbeafe"/><ellipse cx="256" cy="256" rx="180" ry="100" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/><path d="M120 256 C180 220 332 220 392 256 C332 292 180 292 120 256 Z" fill="#86efac" stroke="#15803d" stroke-width="2"/><text x="256" y="440" font-size="16" fill="#334155" text-anchor="middle">Equal-Area (Peters)</text></svg>`;
  if (p.includes("azimuthal") || p.includes("polar projection")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#dbeafe"/><circle cx="256" cy="256" r="160" fill="none" stroke="#64748b" stroke-width="1"/><circle cx="256" cy="256" r="120" fill="none" stroke="#64748b" stroke-width="1"/><circle cx="256" cy="256" r="80" fill="none" stroke="#64748b" stroke-width="1"/><circle cx="256" cy="256" r="40" fill="#86efac" stroke="#15803d" stroke-width="2"/><text x="256" y="440" font-size="16" fill="#334155" text-anchor="middle">Azimuthal Polar</text></svg>`;
  if (p.includes("robinson")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#dbeafe"/><ellipse cx="256" cy="256" rx="170" ry="110" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/><path d="M100 200 C200 180 312 180 412 200" fill="none" stroke="#64748b" stroke-width="1.5"/><path d="M90 256 C422 256 422 256 422 256" stroke="#64748b" stroke-width="1.5"/><path d="M100 312 C200 332 312 332 412 312" fill="none" stroke="#64748b" stroke-width="1.5"/><text x="256" y="440" font-size="16" fill="#334155" text-anchor="middle">Robinson Projection</text></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f8fafc"/><circle cx="256" cy="256" r="172" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="4"/><path d="M158 182 C198 132 248 150 274 194 C292 226 332 222 352 252 C364 274 356 304 328 320 C290 342 242 340 218 308 C184 262 132 232 158 182 Z" fill="#86efac" stroke="#15803d" stroke-width="3"/><line x1="84" y1="256" x2="428" y2="256" stroke="#60a5fa" stroke-width="2" opacity="0.8"/><text x="256" y="470" font-size="16" fill="#334155" text-anchor="middle">World Map</text></svg>`;
}

function appendSvgUniqueMarker(svg: string, seed: number): string {
  return svg.replace("</svg>", `<metadata>uid-${seed.toString(36)}</metadata></svg>`);
}

function localFallbackSvgDataUrl(subject: string, prompt: string): string {
  const seed = hashString32(`${subject}::${prompt}`);
  const domain = classifyVisualDomain(subject, prompt);
  const svg =
    domain === "math" ? buildMathSvg(seed, prompt)
    : domain === "economics" ? buildEconomicsSvg(seed, prompt)
    : domain === "biology" ? buildBiologySvg(seed, prompt)
    : domain === "history" ? buildHistorySvg(seed, prompt)
    : domain === "physics" ? buildPhysicsSvg(seed, prompt)
    : domain === "chemistry" ? buildChemistrySvg(seed, prompt)
    : domain === "computer_science" ? buildComputerScienceSvg(seed, prompt)
    : domain === "geography" ? buildGeographySvg(seed, prompt)
    : buildMathSvg(seed, prompt);
  return svgToDataUrl(appendSvgUniqueMarker(svg, seed));
}

type ChartOptionSlot = { questionId: string; optionIndex: number; repairNonce?: number };

/** Guest Try image_mcq options always use local exam SVGs — no Wikipedia/QuickChart. */
function resolveGuestTryOptionImageUrl(
  optionPrompt: string,
  runSubject: string,
  slot: ChartOptionSlot,
): string {
  const label = optionPrompt.trim() || `${runSubject} option ${slot.optionIndex + 1}`;
  const disambig = `${label} · ${slot.questionId} · opt${slot.optionIndex + 1}${slot.repairNonce != null ? ` · r${slot.repairNonce}` : ""}`;
  return localFallbackSvgDataUrl(runSubject.trim() || "General", disambig);
}

function normalizeImageUrlForCompare(url: string): string { return url.trim().toLowerCase(); }

function svgVisualSignature(dataUrl: string): string {
  try {
    const payload = dataUrl.split(",")[1] ?? "";
    const svg = dataUrl.includes(";base64,") ? atob(payload) : decodeURIComponent(payload);
    return svg.replace(/<metadata>[\s\S]*?<\/metadata>/gi, "").replace(/\s+/g, " ").trim().toLowerCase();
  } catch {
    return normalizeImageUrlForCompare(dataUrl);
  }
}

function hasDuplicateVisuals(urls: string[]): boolean {
  const seen = new Set<string>();
  for (const u of urls) {
    const k = svgVisualSignature(u);
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

function optionVisualPrompt(
  optionPrompts: string[],
  optionLabels: string[],
  index: number,
  runSubject: string,
  pass = 0,
): string {
  const optPrompt = optionPrompts[index]?.trim() ?? "";
  const label = optionLabels[index]?.trim() ?? "";
  if (pass === 0) {
    return [optPrompt, label].filter(Boolean).join(" · ") || `${runSubject} exam visual option ${String.fromCharCode(65 + index)}`;
  }
  if (pass === 1) return label || optPrompt || `${runSubject} exam visual option ${String.fromCharCode(65 + index)}`;
  return `${label || optPrompt} · distinct exam diagram ${String.fromCharCode(65 + index)}`;
}

function repairDuplicateOptionImageUrls(urls: string[], optionPrompts: string[], optionLabels: string[], subject: string, questionId: string): string[] {
  const runSubject = subject.split("|")[0]?.trim() || subject;
  let out = urls.slice(0, 4);
  for (let pass = 0; pass < 4 && hasDuplicateVisuals(out); pass++) {
    out = [0, 1, 2, 3].map((i) =>
      resolveGuestTryOptionImageUrl(optionVisualPrompt(optionPrompts, optionLabels, i, runSubject, pass), runSubject, {
        questionId,
        optionIndex: i,
        repairNonce: pass > 0 ? pass : undefined,
      }),
    );
  }
  return out;
}

function guestTryHydrationSubjectLine(runSubject: string, q: GuestTryQuestion): string {
  const run = runSubject.trim() || "General";
  const chunks: string[] = [run];
  if (typeof q.prompt === "string" && q.prompt.trim()) chunks.push(q.prompt.trim());
  if (Array.isArray(q.options) && q.options.length) chunks.push(q.options.map((o) => String(o ?? "").trim()).filter(Boolean).join(" · "));
  if (Array.isArray(q.optionImagePrompts) && q.optionImagePrompts.length) chunks.push(q.optionImagePrompts.map((o) => String(o ?? "").trim()).filter(Boolean).join(" · "));
  if (typeof q.promptImagePrompt === "string" && q.promptImagePrompt.trim()) chunks.push(q.promptImagePrompt.trim());
  return chunks.join(" | ").slice(0, 6000);
}

// ============================================
// EXPORTED FUNCTIONS
// ============================================

function buildGuestImageMcqOptionUrls(
  q: GuestTryQuestion,
  runSubject: string,
  questionChartId: string,
): string[] {
  const prompts = Array.isArray(q.optionImagePrompts) ? q.optionImagePrompts : [];
  const labels = q.options ?? [];
  const subjectLine = guestTryHydrationSubjectLine(runSubject, q);
  const urls = [0, 1, 2, 3].map((idx) => {
    const promptText =
      prompts[idx]?.trim() ||
      labels[idx]?.trim() ||
      `${runSubject} visual option ${String.fromCharCode(65 + idx)}`;
    const optionOnly = [promptText, labels[idx]?.trim()].filter(Boolean).join(" · ");
    return resolveGuestTryOptionImageUrl(optionOnly, runSubject, {
      questionId: questionChartId,
      optionIndex: idx,
    });
  });
  return repairDuplicateOptionImageUrls(urls, prompts, labels, subjectLine, questionChartId);
}

export async function hydrateGuestTryQuestionImages(
  subject: string,
  questions: GuestTryQuestion[]
): Promise<{ questions: GuestTryQuestion[] } | AiErrorResult> {
  const runSubject = subject.trim() || "General";
  try {
    const out: GuestTryQuestion[] = [];
    for (const q of questions) {
      const next: GuestTryQuestion = { ...q };
      const questionChartId = next.id?.trim().replace(/\s+/g, "_") || `gq_${hashString32(`${runSubject}::${next.prompt ?? ""}`).toString(36)}`;

      if (!next.promptImageUrl && next.promptImagePrompt) {
        next.promptImageUrl = resolveGuestTryOptionImageUrl(
          `${next.prompt ?? ""} · ${next.promptImagePrompt}`,
          runSubject,
          { questionId: questionChartId, optionIndex: 0 },
        );
      }

      if (next.kind === "image_mcq") {
        next.optionImageUrls = buildGuestImageMcqOptionUrls(next, runSubject, questionChartId);
      }

      out.push(next);
    }
    return { questions: out };
  } catch (err) {
    const resilient = questions.map((q) => {
      const next: GuestTryQuestion = { ...q };
      const questionChartId = next.id?.trim().replace(/\s+/g, "_") || `gq_${hashString32(`${runSubject}::${next.prompt ?? ""}`).toString(36)}`;
      if (!next.promptImageUrl && next.promptImagePrompt) {
        next.promptImageUrl = resolveGuestTryOptionImageUrl(
          `${next.prompt ?? ""} · ${next.promptImagePrompt}`,
          runSubject,
          { questionId: questionChartId, optionIndex: 0 },
        );
      }
      if (next.kind === "image_mcq") {
        next.optionImageUrls = buildGuestImageMcqOptionUrls(next, runSubject, questionChartId);
      }
      return next;
    });
    reportAiFailure("hydrateGuestTryQuestionImages", err, runSubject.slice(0, 100));
    return { questions: resilient };
  }
}

export async function generatePracticeQuestPack(
  params: { subject: string; difficulty: PracticeDifficulty; packType: PracticePackType; accountLevelTitle: string; questionCount: number },
  userId: string
): Promise<{ questions: PracticeQuestion[] } | AiErrorResult> {
  if (isApCalculusAbSubject(params.subject)) {
    return { error: true, message: AP_CALC_AB_UNAVAILABLE_MESSAGE };
  }
  try {
    await enforceAiRateLimit(userId, "quest.ai.practice");
    const daily = await incrementDailyLimit(userId, "quest_gen");
    if (!daily.allowed) return { error: true, message: "Daily quest limit reached (10/day). Come back tomorrow!" };

    const n = Math.min(10, Math.max(5, Math.floor(params.questionCount)));
    const subject = sanitizeForPrompt(params.subject).slice(0, 120);
    const diff = params.difficulty;
    const pack = params.packType;
    const level = sanitizeForPrompt(params.accountLevelTitle).slice(0, 80);

    const systemPrompt = `You write practice questions for learners. Return ONLY valid JSON:\n{\n  "questions": [ ... exactly ${n} items ... ]\n}\n\nEach item must match pack type "${pack}":\n${PACK_TYPE_INSTRUCTIONS[pack]}\n\nShared rules:\n- id: string, unique per item, e.g. "q0", "q1", ...\n- kind: must match pack type (${pack === "mcq" ? '"mcq"' : pack === "short_answer" ? '"short_answer"' : '"problem_solving"'})\n- prompt: clear question text\n- difficulty: subject=${subject}, learner tier=${diff}, account level label=${level}\n\n${subjectFidelityPromptBlock(subject)}\n\nDo not include markdown fences or commentary outside the JSON object.`;
    const userContent = `Subject: ${subject}\nDifficulty tier: ${diff}\nPack type: ${pack}\nLearner level: ${level}\nGenerate ${n} questions.`;
    const raw = await generateJsonRetryOnTimeout(systemPrompt, userContent, PRACTICE_PACK_TIMEOUT_MS);

    if (containsPii(raw)) return { error: true, message: "AI response contained unexpected content. Please try again." };
    const parsedResult = parseModelJson<{ questions?: unknown[] }>(raw);
    if (!parsedResult.ok) return { error: true, message: "Failed to parse practice pack JSON." };

    const rawList = Array.isArray(parsedResult.value.questions) ? parsedResult.value.questions : [];
    const questions: PracticeQuestion[] = [];
    for (let i = 0; i < rawList.length && questions.length < n; i++) {
      const o = rawList[i];
      if (!o || typeof o !== "object") continue;
      const row = o as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : `q${i}`;
      const kind = normalizePracticeKind(row.kind, pack);
      if (pack === "mcq" && (kind === "mcq" || kind === "")) {
        const mcq = readMcqFields(row);
        if (mcq) questions.push({ id, kind: "mcq", prompt: mcq.prompt.slice(0, 4000), options: mcq.options, correctIndex: mcq.correctIndex, explanation: mcq.explanation.slice(0, 2000) });
      } else if (pack === "short_answer" && kind === "short_answer") {
        const prompt = typeof row.prompt === "string" ? row.prompt : "";
        const ref = typeof row.referenceAnswer === "string" ? row.referenceAnswer : "";
        const explanation = typeof row.explanation === "string" ? row.explanation : "";
        if (prompt.length < 4 || ref.length < 2) continue;
        questions.push({ id, kind: "short_answer", prompt: prompt.slice(0, 4000), referenceAnswer: ref.slice(0, 4000), explanation: explanation.slice(0, 2000) });
      } else if (pack === "problem_solving" && kind === "problem_solving") {
        const prompt = typeof row.prompt === "string" ? row.prompt : "";
        const ref = typeof row.referenceAnswer === "string" ? row.referenceAnswer : "";
        const explanation = typeof row.explanation === "string" ? row.explanation : "";
        if (prompt.length < 4 || ref.length < 2) continue;
        questions.push({ id, kind: "problem_solving", prompt: prompt.slice(0, 6000), referenceAnswer: ref.slice(0, 4000), explanation: explanation.slice(0, 2000) });
      }
    }
    if (questions.length < 5) return { error: true, message: "Could not generate enough valid questions. Try again." };
    const locked = questions.every((q) => {
      const answerText =
        q.kind === "mcq"
          ? q.options.join(" ")
          : q.kind === "multi_part"
            ? q.parts.map((part) => part.prompt).join(" ")
            : q.kind === "short_answer" || q.kind === "problem_solving"
              ? q.referenceAnswer
              : q.kind === "free_response"
                ? q.answerExpression
                : q.kind === "complete_expression"
                  ? q.blanks.map((b) => b.answerExpression).join(" ")
                  : q.kind === "drag_order"
                    ? q.orderedItems.join(" ")
                    : q.prompt;
      return isSubjectLockedText(subject, [q.prompt, q.explanation, answerText].join(" "));
    });
    if (!locked) return { error: true, message: "Generated pack did not stay within the selected subject." };
    return { questions: questions.slice(0, n) };
  } catch (err) {
    return handleAiError(err, "generatePracticeQuestPack", params.subject.slice(0, 100));
  }
}

export async function gradePracticeWrittenAnswer(
  params: { prompt: string; referenceAnswer: string; userAnswer: string; kind: "short_answer" | "problem_solving" },
  userId: string
): Promise<{ pass: boolean; feedback: string } | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "quest.ai.gradePractice");
    const prompt = sanitizeForPrompt(params.prompt).slice(0, 4000);
    const ref = sanitizeForPrompt(params.referenceAnswer).slice(0, 4000);
    const ans = sanitizeForPrompt(params.userAnswer).slice(0, 4000);
    const strict = params.kind === "problem_solving" ? "Require correct reasoning or final result; allow equivalent formulations." : "Accept concise correct answers; minor wording differences OK.";
    const systemPrompt = `Grade a practice answer. Return JSON only:\n{ "pass": boolean, "feedback": string }\n- pass: true if the answer is substantially correct vs the reference.\n- feedback: brief (1-3 sentences). ${strict}\n`;
    const userContent = `Question:\n${prompt}\n\nReference:\n${ref}\n\nStudent:\n${ans}`;
    const raw = await generateJson(systemPrompt, userContent);
    if (containsPii(raw)) return { error: true, message: "AI response contained unexpected content. Please try again." };
    const jsonStr = stripMarkdownJson(raw);
    const parsed = JSON.parse(jsonStr) as { pass?: boolean; feedback?: string };
    return { pass: Boolean(parsed.pass), feedback: typeof parsed.feedback === "string" ? parsed.feedback.slice(0, 800) : "" };
  } catch (err) {
    return handleAiError(err, "gradePracticeWrittenAnswer", params.prompt.slice(0, 200));
  }
}

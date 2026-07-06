/** Deterministic ATS-style scan for AP Calculus AB Guide proficiency — no AI. */

export type ProficiencyScanCheckId =
  | "skill_match"
  | "mastery_signal"
  | "evidence_link"
  | "evidence_format"
  | "proof_depth";

export type ProficiencyScanCheck = {
  id: ProficiencyScanCheckId;
  label: string;
  pass: boolean;
  detail: string;
};

export type ProficiencyScanVerdict = "verified" | "needs_revision";

export type ProficiencyScanResult = {
  checks: ProficiencyScanCheck[];
  verdict: ProficiencyScanVerdict;
  score: number;
  verdictSentence: string;
  nextAction: string;
};

const CALC_RE =
  /\b(ap\s*)?calculus|calc(?:ulus)?\s*(?:ab|bc)?\b|derivative|integral|limit|series|differential/i;
const MASTERY_RE =
  /\b(ap\s*(?:calc(?:ulus)?)?\s*(?:ab|bc)?\s*[:\-]?\s*[45]|score[d]?\s*(?:a\s*)?[45]|perfect\s*score)\b/i;
const ROLE_RE =
  /\b(teaching assistant|\bta\b|tutor|instructor|lecturer|coach|professor|adjunct)\b/i;
const DEGREE_RE =
  /\b(b\.?s\.?|m\.?s\.?|ph\.?d\.?|bachelor|master|degree).{0,24}(math|calculus|stem)\b/i;
const EXPERIENCE_RE =
  /\b\d+\+?\s*(?:years?|yrs?).{0,20}(teach|tutor|coach|session|student)/i;

function hasMasterySignal(proof: string): boolean {
  return (
    MASTERY_RE.test(proof) ||
    ROLE_RE.test(proof) ||
    DEGREE_RE.test(proof) ||
    EXPERIENCE_RE.test(proof)
  );
}

function evidenceLooksLikeDocument(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\.(pdf|png|jpe?g|webp)(\?|$)/i.test(lower)) return true;
  if (/\/tutor-evidence\//i.test(lower)) return true;
  return /\b(transcript|certificate|cert|diploma|score|ap[-_]?score|collegeboard|credly|acclaim)\b/i.test(
    lower,
  );
}

export function scanGuideProficiencyProof(input: {
  proofDescription: string;
  evidenceUrl: string;
}): ProficiencyScanResult {
  const proof = input.proofDescription.trim();
  const evidence = input.evidenceUrl.trim();
  const proofLower = proof.toLowerCase();

  const skillMatch = CALC_RE.test(proof) || /\bap\s*5\b/i.test(proof);
  const masterySignal = hasMasterySignal(proof);
  const evidenceLink = /^https?:\/\/.{8,}/i.test(evidence);
  const evidenceFormat = evidenceLink && evidenceLooksLikeDocument(evidence);
  const proofDepth =
    proof.length >= 24 &&
    (/\d/.test(proof) || ROLE_RE.test(proof) || DEGREE_RE.test(proof) || /\bap\b/i.test(proofLower));

  const checks: ProficiencyScanCheck[] = [
    {
      id: "skill_match",
      label: "AP Calculus AB relevance",
      pass: skillMatch,
      detail: skillMatch
        ? "Proof ties to Calculus AB teaching."
        : "Name AP Calculus AB, a score, or calculus teaching.",
    },
    {
      id: "mastery_signal",
      label: "Mastery credential",
      pass: masterySignal,
      detail: masterySignal
        ? "Credential or teaching role detected."
        : "Add AP score, TA role, degree, or years coaching.",
    },
    {
      id: "evidence_link",
      label: "Evidence link",
      pass: evidenceLink,
      detail: evidenceLink
        ? "Secure link attached."
        : "Upload a file or paste a full https link.",
    },
    {
      id: "evidence_format",
      label: "Evidence format",
      pass: evidenceFormat,
      detail: evidenceFormat
        ? "Transcript, certificate, or upload recognized."
        : "Use PDF, image, or a transcript or certificate URL.",
    },
    {
      id: "proof_depth",
      label: "Proof specificity",
      pass: proofDepth,
      detail: proofDepth
        ? "Enough detail to verify."
        : "Add scores, roles, or years with numbers.",
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);

  const criticalPass =
    skillMatch && masterySignal && evidenceLink && evidenceFormat && proofDepth;

  if (criticalPass) {
    return {
      checks,
      score,
      verdict: "verified",
      verdictSentence: "AP Calculus AB proficiency verified. Open slots now.",
      nextAction: "Add slots on home.",
    };
  }

  const firstFail = checks.find((c) => !c.pass);
  return {
    checks,
    score,
    verdict: "needs_revision",
    verdictSentence: firstFail
      ? `${firstFail.label} did not pass.`
      : "Proof needs more detail before verify.",
    nextAction: firstFail?.detail ?? "Fix the gaps above and resubmit.",
  };
}

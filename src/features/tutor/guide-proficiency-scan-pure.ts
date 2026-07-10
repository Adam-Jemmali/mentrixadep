/** Deterministic ATS-style scan for AP Calculus AB Guide proficiency — no AI. */

export type ProficiencyScanCheckId =
  | "skill_match"
  | "mastery_signal"
  | "evidence_link"
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
  /\b(ap\s*)?calculus|calc(?:ulus)?\s*(?:ab|bc)?\b|derivative|integral|limit|series|differential|\bap\s*5\b/i;
const MASTERY_RE =
  /\b(ap\s*(?:calc(?:ulus)?)?\s*(?:ab|bc)?\s*[:\-]?\s*[45]|score[d]?\s*(?:a\s*)?[45]|perfect\s*score|[45]\s*on\s*ap)\b/i;
const ROLE_RE =
  /\b(teaching assistant|\bta\b|tutor|instructor|lecturer|coach|professor|adjunct|teach|taught|helped)\b/i;
const DEGREE_RE =
  /\b(b\.?s\.?|m\.?s\.?|ph\.?d\.?|bachelor|master|degree|major).{0,32}(math|calculus|stem)?\b/i;
const EXPERIENCE_RE =
  /\b\d+\+?\s*(?:years?|yrs?|semesters?|sessions?).{0,28}(teach|tutor|coach|session|student|calc)?/i;

function hasMasterySignal(proof: string): boolean {
  return (
    MASTERY_RE.test(proof) ||
    ROLE_RE.test(proof) ||
    DEGREE_RE.test(proof) ||
    EXPERIENCE_RE.test(proof) ||
    /\b(certificate|transcript|credential|qualified)\b/i.test(proof)
  );
}

export function scanGuideProficiencyProof(input: {
  proofDescription: string;
  evidenceUrl: string;
}): ProficiencyScanResult {
  const proof = input.proofDescription.trim();
  const evidence = input.evidenceUrl.trim();
  const proofLower = proof.toLowerCase();

  const skillMatch = CALC_RE.test(proof) || /\bap\b/i.test(proof);
  const masterySignal = hasMasterySignal(proof);
  const evidenceLink = /^https?:\/\/.{8,}/i.test(evidence);
  const proofDepth = proof.length >= 12 && (/\d/.test(proof) || ROLE_RE.test(proof) || /\bap\b/i.test(proofLower) || masterySignal);

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
        : "Paste a full https link to a transcript, certificate, or portfolio.",
    },
    {
      id: "proof_depth",
      label: "Proof specificity",
      pass: proofDepth,
      detail: proofDepth
        ? "Enough detail to verify."
        : "Add a short note with your score, role, or years.",
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);

  const criticalPass = skillMatch && masterySignal && evidenceLink && proofDepth;

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

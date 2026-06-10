/**
 * Map course / division labels to a coarse STEM bucket so offline fallback packs
 * stay on-domain instead of mixing unrelated disciplines.
 */
export type StemBucket =
  | "mathematics"
  | "biology"
  | "chemistry"
  | "physics"
  | "economics"
  | "history"
  | "computer_science"
  | "general";

/** Order: more specific compound subjects before broad buckets. */
export function inferStemBucket(subjectRaw: string): StemBucket {
  const s = subjectRaw.toLowerCase().replace(/\s+division$/i, "").trim();
  if (!s) return "general";

  if (
    /(economics|microeconomics|macroeconomics|finance|business\s+econ|market\s+structure)/.test(s)
  ) {
    return "economics";
  }
  if (/(computer\s+science|programming|software|data\s+structures|algorithms|\bcs\b|coding)/.test(s)) {
    return "computer_science";
  }
  if (/(biochemistry|organic\s+chemistry|chemistry|chem\b|stoichiometry|periodic)/.test(s)) {
    return "chemistry";
  }
  if (/(physics|mechanics|electricity|thermodynamics|waves|\bem\b\s+field)/.test(s)) {
    return "physics";
  }
  if (/(biology|physiology|genetics|anatomy|ecology|cell\s+biology|dna\b)/.test(s)) {
    return "biology";
  }
  if (/(history|historical|government|civics|social\s+studies)/.test(s)) {
    return "history";
  }
  if (
    /(math|mathematics|algebra|calculus|geometry|statistics|trigonometry|precalculus|pre-calculus)/.test(s)
  ) {
    return "mathematics";
  }
  return "general";
}

/** User-facing name for skills with a verified first attempt on record. */
export const RANK_PROOFS_LABEL = "Rank proofs";

export const RANK_PROOFS_DETAIL =
  "First try on each skill, locked forever. Practice after that never moves rank.";

export function rankProofsCountLabel(count: number): string {
  return `${count} rank proof${count === 1 ? "" : "s"}`;
}

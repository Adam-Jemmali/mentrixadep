import { MENTRIXA_RANK_PROOFS_DETAIL } from "@/features/copy/mentrixa-simple-copy-pure";

/** User-facing name for skills with a locked first answer on record. */
export const RANK_PROOFS_LABEL = "Rank proofs";

export const RANK_PROOFS_DETAIL = MENTRIXA_RANK_PROOFS_DETAIL;

export function rankProofsCountLabel(count: number): string {
  return `${count} rank proof${count === 1 ? "" : "s"}`;
}

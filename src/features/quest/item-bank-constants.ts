/** AP Calculus AB item bank coverage targets (PROMPT 003). */
export const ITEM_BANK_MIN_APPROVED = 300;
export const ITEM_BANK_MAX_APPROVED = 500;
export const ITEM_BANK_MIN_PER_NODE = 3;
export const ITEM_BANK_TARGET_PER_NODE = 4;

export function formatItemBankVerdict(approved: number, nodesBelowTarget: number): string {
  if (approved >= ITEM_BANK_MIN_APPROVED && nodesBelowTarget === 0) {
    return `${approved} approved items are live. Every skill node has at least ${ITEM_BANK_MIN_PER_NODE} verified questions.`;
  }
  if (approved < ITEM_BANK_MIN_APPROVED) {
    const remaining = ITEM_BANK_MIN_APPROVED - approved;
    return `${approved} of ${ITEM_BANK_MIN_APPROVED} minimum approved items. ${remaining} more needed before AP Calculus AB practice is fully banked.`;
  }
  return `${approved} approved items live, but ${nodesBelowTarget} skill node${nodesBelowTarget === 1 ? "" : "s"} still have fewer than ${ITEM_BANK_MIN_PER_NODE} questions.`;
}

export function formatItemBankNextAction(
  approved: number,
  nodesBelowTarget: number
): string {
  if (approved >= ITEM_BANK_MIN_APPROVED && nodesBelowTarget === 0) {
    return "Next: run item-bank:generate only when adding new skill nodes or refreshing stale questions.";
  }
  return "Next: run npm run item-bank:generate to auto-verify and insert approved items offline.";
}

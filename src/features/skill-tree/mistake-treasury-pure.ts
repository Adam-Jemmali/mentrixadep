export type MissEventRow = {
  itemId: string | null;
};

/** Distinct reviewed miss item ids, newest events first. */
export function distinctMissItemIds(
  events: MissEventRow[],
  approvedItemIds: ReadonlySet<string>,
  limit = 24,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const event of events) {
    const id = event.itemId?.trim();
    if (!id || seen.has(id) || !approvedItemIds.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }

  return out;
}

export function mistakeTreasuryQuestionCount(
  availableMisses: number,
  requested = 5,
): number {
  if (availableMisses <= 0) return 0;
  return Math.min(Math.max(3, requested), availableMisses);
}

export function shouldShowClearMissesCta(missItemCount: number): boolean {
  return missItemCount > 0;
}

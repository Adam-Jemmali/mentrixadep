export type SkillErrorEventRow = {
  skillNodeId: string;
  failureTag: string | null;
  secondaryTags: string[];
};

export type SecondaryTagDeficit = {
  tag: string;
  count: number;
};

/** Minimum events for a secondary tag before it redirects Next. */
export const SECONDARY_DEFICIT_MIN_COUNT = 2;

/**
 * Aggregate secondary tags from recent error events.
 * Highest count wins; ties keep first-seen order.
 */
export function aggregateSecondaryTagDeficits(
  events: SkillErrorEventRow[],
  minCount: number = SECONDARY_DEFICIT_MIN_COUNT,
): SecondaryTagDeficit[] {
  const counts = new Map<string, number>();
  const order: string[] = [];

  for (const event of events) {
    for (const raw of event.secondaryTags) {
      const tag = raw.trim().toLowerCase();
      if (!tag) continue;
      if (!counts.has(tag)) order.push(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return order
    .map((tag) => ({ tag, count: counts.get(tag) ?? 0 }))
    .filter((entry) => entry.count >= minCount)
    .sort((a, b) => b.count - a.count || order.indexOf(a.tag) - order.indexOf(b.tag));
}

export function pickTopSecondaryDeficit(
  events: SkillErrorEventRow[],
  minCount: number = SECONDARY_DEFICIT_MIN_COUNT,
): SecondaryTagDeficit | null {
  return aggregateSecondaryTagDeficits(events, minCount)[0] ?? null;
}

/**
 * Resolve a secondary tag (usually a node slug) to a skill node id.
 * Prefer unlocked target; else walk parents for the nearest unlocked ancestor.
 */
export function resolveCauseFocusNodeId(input: {
  tag: string;
  slugToNodeId: Map<string, string>;
  parents: Map<string, string[]>;
  unlockedIds: Set<string>;
}): string | null {
  const normalized = input.tag.trim().toLowerCase();
  if (!normalized) return null;

  const targetId =
    input.slugToNodeId.get(normalized) ??
    input.slugToNodeId.get(input.tag.trim()) ??
    null;
  if (!targetId) return null;

  if (input.unlockedIds.has(targetId)) return targetId;

  const queue = [...(input.parents.get(targetId) ?? [])];
  const seen = new Set<string>([targetId]);

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    if (seen.has(parentId)) continue;
    seen.add(parentId);
    if (input.unlockedIds.has(parentId)) return parentId;
    for (const grand of input.parents.get(parentId) ?? []) {
      if (!seen.has(grand)) queue.push(grand);
    }
  }

  return null;
}

export function failureTagFromDistractor(
  distractorTags: Record<string, string> | null | undefined,
  selectedOptionText: string,
  selectedIndex: number,
): string | null {
  if (!distractorTags) return null;
  const byText = distractorTags[selectedOptionText]?.trim();
  if (byText) return byText;
  const byIndex = distractorTags[String(selectedIndex)]?.trim();
  if (byIndex) return byIndex;
  return null;
}

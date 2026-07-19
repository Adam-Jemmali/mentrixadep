/** Session baseline so unlock bloom can fire after a remount from quest. */

export const SKILL_TREE_UNLOCKED_BASELINE_KEY = "mentrixa.skillTree.unlockedBaseline";

export function diffNewlyUnlockedIds(
  previousIds: readonly string[],
  currentIds: readonly string[],
): string[] {
  const previous = new Set(previousIds);
  return currentIds.filter((id) => !previous.has(id));
}

export function parseUnlockedBaseline(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function serializeUnlockedBaseline(ids: readonly string[]): string {
  return JSON.stringify([...ids]);
}

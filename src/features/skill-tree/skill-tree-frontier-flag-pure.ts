/**
 * Skill-tree Frontier rollout flag.
 * Default ON. Set SKILL_TREE_FRONTIER=0 to roll back UI + unlock gate only.
 * Does not fork the data model.
 */
export function isSkillTreeFrontierEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.SKILL_TREE_FRONTIER;
  if (raw == null || raw.trim() === "") return true;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "0" || normalized === "false" || normalized === "off") {
    return false;
  }
  return true;
}

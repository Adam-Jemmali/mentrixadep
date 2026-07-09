import { normalizeNodeKey } from "@/features/quest/ap-calc-ab-subject";

export const STUDIO_RETEST_DELAY_MS = 48 * 60 * 60 * 1000;

export type SkillNodeTopicRef = {
  id: string;
  node_name: string;
  node_slug: string;
};

export function addStudioRetestDelay(publishedAt: Date): Date {
  return new Date(publishedAt.getTime() + STUDIO_RETEST_DELAY_MS);
}

export function topicMatchesSkillNode(topic: string, node: SkillNodeTopicRef): boolean {
  const normalizedTopic = normalizeNodeKey(topic);
  if (!normalizedTopic) return false;
  const normalizedName = normalizeNodeKey(node.node_name);
  const normalizedSlug = normalizeNodeKey(node.node_slug);
  return (
    normalizedTopic === normalizedName ||
    normalizedTopic === normalizedSlug ||
    normalizedTopic.includes(normalizedName) ||
    normalizedName.includes(normalizedTopic)
  );
}

export function resolveCoveredSkillNodeIds(
  targetNodeIds: string[],
  followUpTopics: string[],
  skillNodes: SkillNodeTopicRef[],
): string[] {
  const covered = new Set(targetNodeIds);

  for (const topic of followUpTopics) {
    const trimmed = topic.trim();
    if (!trimmed) continue;
    const match = skillNodes.find((node) => topicMatchesSkillNode(trimmed, node));
    if (match) covered.add(match.id);
  }

  return [...covered];
}

export function isStudioRetestDue(
  retestScheduledAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!retestScheduledAt) return true;
  const scheduledMs = new Date(retestScheduledAt).getTime();
  if (!Number.isFinite(scheduledMs)) return true;
  return scheduledMs <= nowMs;
}

export function formatStudioRetestConfirmationLine(
  studentName: string,
  scheduledAtIso: string,
  skillsCovered: number,
  formatDate: (iso: string) => string,
): string {
  const name = studentName.trim() || "your student";
  const dateLabel = formatDate(scheduledAtIso);
  const skillLabel = skillsCovered === 1 ? "1 skill" : `${skillsCovered} skills`;
  return `Retest scheduled for ${name} on ${dateLabel} across ${skillLabel}. Your impact score will update when it completes.`;
}

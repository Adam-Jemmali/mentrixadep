import type { StoredPreSessionBrief } from "@/features/pre-session-brief/brief";

export function mapBriefRow(
  row: Record<string, unknown>,
  sessionId: string,
): StoredPreSessionBrief {
  return {
    id: String(row.id ?? ""),
    sessionId,
    likelyCoverage: Array.isArray(row.likely_coverage)
      ? (row.likely_coverage as unknown[]).map(String)
      : [],
    weakSpotsToWatch: Array.isArray(row.weak_spots)
      ? (row.weak_spots as unknown[]).map(String)
      : [],
    warmUpExercise: {
      title: String(row.warm_up_title ?? "Quick warm-up"),
      prompt: String(row.warm_up_prompt ?? ""),
      hint:
        typeof row.warm_up_hint === "string" && row.warm_up_hint.trim()
          ? row.warm_up_hint
          : undefined,
    },
    questionsToAsk: Array.isArray(row.questions_to_ask)
      ? (row.questions_to_ask as unknown[]).map(String)
      : [],
    createdAt: String(row.created_at ?? ""),
  };
}

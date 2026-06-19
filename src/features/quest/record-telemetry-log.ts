import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { subjectsLooselyMatch } from "@/features/pre-session-brief/context-pure";

export type QuestTelemetryPayload = {
  keystrokeVariance: number;
  tabFocusLeaks: number;
  frictionScore: number;
  isAnomalyDetected: boolean;
};

export async function recordQuestTelemetryLog(
  userId: string,
  questId: string,
  telemetry: QuestTelemetryPayload
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("telemetry_logs" as "users").insert({
    user_id: userId,
    quest_id: questId,
    keystroke_flight_variance: telemetry.keystrokeVariance,
    focus_leak_count: telemetry.tabFocusLeaks,
    computed_friction_score: telemetry.frictionScore,
    is_anomaly_detected: telemetry.isAnomalyDetected,
  } as never);
}

export async function getAverageSessionFocusSignal(
  userId: string,
  subject: string,
  limit = 5
): Promise<number | null> {
  const admin = createAdminClient();

  try {
    const { data, error } = await admin
      .from("telemetry_logs" as "users")
      .select("computed_friction_score, quest_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error || !data?.length) return null;

    const { data: quests } = await admin
      .from("quests")
      .select("id, metadata")
      .in(
        "id",
        (data as { quest_id: string | null }[])
          .map((row) => row.quest_id)
          .filter((id): id is string => typeof id === "string")
      );

    const subjectByQuest = new Map<string, string>();
    for (const quest of quests ?? []) {
      const meta = quest.metadata as { course?: string; subject?: string } | null;
      const course =
        typeof meta?.course === "string"
          ? meta.course
          : typeof meta?.subject === "string"
            ? meta.subject
            : "";
      if (course) subjectByQuest.set(quest.id, course);
    }

    const normalizedSubject = subject.trim();
    const scores: number[] = [];

    for (const row of data as {
      computed_friction_score?: number | null;
      quest_id?: string | null;
    }[]) {
      const questId = row.quest_id;
      if (!questId) continue;
      const questSubject = subjectByQuest.get(questId);
      if (!questSubject || !subjectsLooselyMatch(questSubject, normalizedSubject)) continue;

      const score = row.computed_friction_score;
      if (typeof score === "number" && Number.isFinite(score)) {
        scores.push(score);
      }
      if (scores.length >= limit) break;
    }

    if (scores.length === 0) return null;
    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    return parseFloat(average.toFixed(2));
  } catch {
    return null;
  }
}

/**
 * Breakthrough detection after quest completion — internal server-only.
 * Not a server action module; import from trusted server code only.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getSiteUrl } from "@/shared/core/site";
import { averageAccuracy, shouldDetectBreakthrough } from "@/features/breakthrough-events/detect-pure";
import type { BreakthroughCelebration } from "@/features/breakthrough-events/types";
import {
  BREAKTHROUGH_OLD_MIN_DAYS,
  BREAKTHROUGH_OLD_QUESTS,
  BREAKTHROUGH_RECENT_QUESTS,
} from "@/features/breakthrough-events/types";
import { queueBreakthroughAdaptiveQuests } from "@/features/breakthrough-events/adaptive-quests";
import { scheduleBreakthroughRetest } from "@/features/intervention-retests/schedule-intervention-retests";
import { notifyGuideOfBreakthrough } from "@/features/breakthrough-events/guide-notify";
import { publishBreakthroughLiveBoardEvent } from "@/features/live-board/write-live-board-events";
import { trackEvent } from "@/shared/integrations/analytics";

type ConceptAccuracyRow = { quest_id: string; accuracy: number; created_at: string };

async function conceptQuestAccuracies(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  subject: string,
  concept: string,
): Promise<ConceptAccuracyRow[]> {
  const { data } = await admin
    .from("quest_topic_tags")
    .select("quest_id, correct, created_at")
    .eq("user_id", studentId)
    .eq("subject", subject)
    .eq("subtopic", concept)
    .order("created_at", { ascending: false })
    .limit(80);

  const byQuest = new Map<string, { correct: number; total: number; created_at: string }>();
  for (const row of data ?? []) {
    const cur = byQuest.get(row.quest_id) ?? {
      correct: 0,
      total: 0,
      created_at: String(row.created_at),
    };
    cur.total += 1;
    if (row.correct) cur.correct += 1;
    byQuest.set(row.quest_id, cur);
  }

  return Array.from(byQuest.entries()).map(([quest_id, v]) => ({
    quest_id,
    created_at: v.created_at,
    accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }));
}

async function findRecentSessionId(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  subject: string,
): Promise<string | null> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 14);

  const { data } = await admin
    .from("sessions")
    .select("id, course, end_time")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .gte("end_time", since.toISOString())
    .order("end_time", { ascending: false })
    .limit(10);

  const subjectLower = subject.toLowerCase();
  for (const row of data ?? []) {
    const course = String(row.course ?? "").toLowerCase();
    if (course.includes(subjectLower) || subjectLower.includes(course)) {
      return row.id;
    }
  }
  return null;
}

export async function detectBreakthroughsAfterQuest(params: {
  studentId: string;
  questId: string;
  subject: string;
  triggeredBy?: "quest" | "duel";
}): Promise<BreakthroughCelebration | null> {
  try {
    const admin = createAdminClient();
    const subject = params.subject.trim();
    if (!subject) return null;

    const { data: tags } = await admin
      .from("quest_topic_tags")
      .select("subtopic, topic")
      .eq("user_id", params.studentId)
      .eq("quest_id", params.questId)
      .eq("subject", subject);

    const concepts = Array.from(
      new Set((tags ?? []).map((t) => String(t.subtopic).trim()).filter(Boolean)),
    );
    if (concepts.length === 0) return null;

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - BREAKTHROUGH_OLD_MIN_DAYS);

    for (const concept of concepts) {
      const { data: recentDup } = await admin
        .from("breakthrough_events")
        .select("id")
        .eq("student_id", params.studentId)
        .eq("subject", subject)
        .eq("concept", concept)
        .gte("detected_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (recentDup) continue;

      const rows = await conceptQuestAccuracies(admin, params.studentId, subject, concept);
      const recent = rows.slice(0, BREAKTHROUGH_RECENT_QUESTS).map((r) => r.accuracy);
      const old = rows
        .filter((r) => new Date(r.created_at) <= cutoff)
        .slice(0, BREAKTHROUGH_OLD_QUESTS)
        .map((r) => r.accuracy);

      if (!shouldDetectBreakthrough(recent, old)) continue;

      const accuracyBefore = averageAccuracy(old);
      const accuracyAfter = averageAccuracy(recent);
      const topic =
        (tags ?? []).find((t) => String(t.subtopic) === concept)?.topic?.toString() ?? subject;
      const sessionId = await findRecentSessionId(admin, params.studentId, subject);

      const { data: inserted, error } = await admin
        .from("breakthrough_events")
        .insert({
          student_id: params.studentId,
          subject,
          concept,
          accuracy_before: accuracyBefore,
          accuracy_after: accuracyAfter,
          session_id: sessionId,
          triggered_by: sessionId ? "session" : params.triggeredBy ?? "quest",
        })
        .select("id")
        .single();

      if (error || !inserted) continue;

      const siteUrl = getSiteUrl();
      const sharePath = `/breakthrough/${inserted.id}`;
      const shareUrl = `${siteUrl}${sharePath}`;
      const ogImageUrl = `${siteUrl}/api/og/breakthrough?event_id=${inserted.id}`;

      const nextConcept = await queueBreakthroughAdaptiveQuests({
        eventId: inserted.id,
        studentId: params.studentId,
        subject,
        topic,
        brokenConcept: concept,
      });

      void scheduleBreakthroughRetest({
        eventId: inserted.id,
        studentId: params.studentId,
        subject,
        concept,
      });

      if (sessionId) {
        void notifyGuideOfBreakthrough({
          sessionId,
          studentId: params.studentId,
          concept,
          accuracyBefore,
          accuracyAfter,
        });
      }

      void trackEvent("breakthrough_detected", {
        userId: params.studentId,
        properties: {
          event_id: inserted.id,
          subject,
          concept,
          accuracy_before: accuracyBefore,
          accuracy_after: accuracyAfter,
          triggered_by: sessionId ? "session" : "quest",
        },
      });

      void publishBreakthroughLiveBoardEvent({
        studentId: params.studentId,
        subject,
        concept,
        accuracyAfter,
      });

      return {
        eventId: inserted.id,
        subject,
        concept,
        accuracyBefore,
        accuracyAfter,
        nextConcept,
        shareUrl,
        ogImageUrl,
      };
    }

    return null;
  } catch {
    return null;
  }
}

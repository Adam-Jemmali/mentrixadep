"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  buildAdaptiveContext,
  pickDownstreamSubtopics,
  type KnowledgeNode,
} from "@/features/learning-path/knowledge-graph-lib";
import { getRecentQuestSubtopics } from "@/features/learning-path/knowledge-graph";
import { generateAdaptiveQuestPack } from "@/shared/integrations/ai/practice";
import { getAccountLevelFromTotalXp } from "@/features/xp/levels";
import type { PracticePackMetadata, PracticeQuestion } from "@/features/quest/practice-quest-types";
import { createClient } from "@/shared/integrations/supabase/server";

async function loadKnowledgeNodes(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
): Promise<KnowledgeNode[]> {
  const { data } = await admin
    .from("student_knowledge_nodes")
    .select("*")
    .eq("user_id", studentId);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    userId: studentId,
    subject: String(row.subject),
    topic: String(row.topic),
    subtopic: String(row.subtopic),
    masteryScore: Number(row.mastery_score ?? 0),
    attempts: Number(row.attempts ?? 0),
    correct: Number(row.correct ?? 0),
    correctStreak: Number(row.correct_streak ?? 0),
    lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  }));
}

export async function queueBreakthroughAdaptiveQuests(params: {
  eventId: string;
  studentId: string;
  subject: string;
  topic: string;
  brokenConcept: string;
}): Promise<string | null> {
  const admin = createAdminClient();
  const nodes = await loadKnowledgeNodes(admin, params.studentId);
  const downstream = pickDownstreamSubtopics(
    nodes,
    params.subject,
    params.topic,
    params.brokenConcept,
    3,
  );

  if (downstream.length === 0) return null;

  const rows = downstream.map((node, i) => ({
    breakthrough_event_id: params.eventId,
    student_id: params.studentId,
    subject: params.subject,
    topic: node.topic,
    target_subtopic: node.subtopic,
    sort_order: i + 1,
  }));

  await admin.from("breakthrough_quest_queue").insert(rows);
  return downstream[0]!.subtopic;
}

export async function createNextBreakthroughQuest(
  eventId: string,
): Promise<
  | { success: true; questId: string; targetSubtopic: string }
  | { success: false; error: string }
> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data: queueRow } = await admin
    .from("breakthrough_quest_queue")
    .select("id, subject, topic, target_subtopic, sort_order, quest_id")
    .eq("breakthrough_event_id", eventId)
    .eq("student_id", user.id)
    .is("completed_at", null)
    .is("quest_id", null)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!queueRow) {
    return { success: false, error: "No adaptive quest queued." };
  }

  const { data: xpRow } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", user.id)
    .maybeSingle();
  const levelInfo = getAccountLevelFromTotalXp(xpRow?.total_xp ?? 0);

  const nodes = await loadKnowledgeNodes(admin, user.id);
  const adaptiveContext = buildAdaptiveContext(nodes);
  adaptiveContext.weakSubtopics = [
    {
      subject: queueRow.subject,
      topic: queueRow.topic,
      subtopic: queueRow.target_subtopic,
      mastery: 20,
    },
  ];

  const recentSubtopics = await getRecentQuestSubtopics(user.id);
  const gen = await generateAdaptiveQuestPack(
    {
      subject: queueRow.subject,
      packType: "mcq",
      accountLevelTitle: levelInfo.title,
      questionCount: 5,
      adaptiveContext,
      recentSubtopics,
    },
    user.id,
  );

  if ("error" in gen && gen.error) {
    return { success: false, error: gen.message ?? "Could not generate adaptive quest." };
  }

  const questions = (gen as { questions: PracticeQuestion[] }).questions;
  const meta: PracticePackMetadata = {
    questKind: "practice_pack",
    subject: queueRow.subject,
    difficulty: "intermediate",
    packType: "mcq",
    accountLevelTitle: levelInfo.title,
    questionCount: questions.length,
    timeLimitSec: 15 * 60,
    course: queueRow.subject,
    questions,
    breakthroughEventId: eventId,
    focusSubtopic: queueRow.target_subtopic,
  };

  const supabase = await createClient();
  const title = `Breakthrough path: ${queueRow.target_subtopic}`;
  const { data: quest, error: insErr } = await supabase
    .from("quests")
    .insert({
      creator_user_id: user.id,
      prompt: title,
      metadata: meta as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (insErr || !quest) {
    return { success: false, error: "Failed to create quest." };
  }

  await admin
    .from("breakthrough_quest_queue")
    .update({ quest_id: quest.id })
    .eq("id", queueRow.id);

  await supabase.from("user_quest_progress").insert({
    user_id: user.id,
    quest_id: quest.id,
    status: "in_progress",
    num_attempts: 0,
  });

  return {
    success: true,
    questId: quest.id,
    targetSubtopic: queueRow.target_subtopic,
  };
}

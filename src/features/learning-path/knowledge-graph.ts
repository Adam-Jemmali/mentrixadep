"use server";

/**
 * Knowledge Graph — server actions.
 * Update mastery scores after quest attempts, fetch graph for display/AI.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { requireRole } from "@/shared/core/auth";
import {
  computeMasteryDelta,
  buildAdaptiveContext,
  buildKnowledgeTree,
  buildNextStepRecommendations,
  type KnowledgeNode,
  type KnowledgeNodeUpdate,
  type SubjectEntry,
  type NextStepRecommendation,
  type AdaptiveContext,
} from "@/features/learning-path/knowledge-graph-lib";
import {
  AP_CALC_AB_SUBJECT,
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";

// ─── DB row mapper ────────────────────────────────────────────────────────────

function rowToNode(row: Record<string, unknown>): KnowledgeNode {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    subject: String(row.subject ?? ""),
    topic: String(row.topic ?? ""),
    subtopic: String(row.subtopic ?? ""),
    skillNodeId: typeof row.skill_node_id === "string" ? row.skill_node_id : null,
    masteryScore: Number(row.mastery_score ?? 0),
    attempts: Number(row.attempts ?? 0),
    correct: Number(row.correct ?? 0),
    correctStreak: Number(row.correct_streak ?? 0),
    firstAttemptCorrect:
      typeof row.first_attempt_correct === "boolean" ? row.first_attempt_correct : null,
    lastSeenAt: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

async function upsertApCalcSkillNode(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  questId: string,
  update: KnowledgeNodeUpdate,
  now: string
): Promise<void> {
  const skillNodeId = update.skillNodeId;
  if (!skillNodeId) return;

  const { data: skillNode, error: skillNodeError } = await admin
    .from("skill_nodes")
    .select("id, subject, unit_name, node_name")
    .eq("id", skillNodeId)
    .maybeSingle();

  if (skillNodeError || !skillNode) return;

  const subject = AP_CALC_AB_SUBJECT;
  const topic = skillNode.unit_name;
  const subtopic = skillNode.node_name;

  const { data: existing } = await admin
    .from("student_knowledge_nodes")
    .select("mastery_score, attempts, correct, correct_streak, first_attempt_correct")
    .eq("user_id", userId)
    .eq("skill_node_id", skillNodeId)
    .maybeSingle();

  const currentScore = (existing?.mastery_score as number | null) ?? 0;
  const currentStreak = (existing?.correct_streak as number | null) ?? 0;
  const currentAttempts = (existing?.attempts as number | null) ?? 0;
  const currentCorrect = (existing?.correct as number | null) ?? 0;
  const { newScore, newStreak } = computeMasteryDelta(currentScore, update.correct, currentStreak);

  const firstAttemptCorrect = existing
    ? (existing.first_attempt_correct as boolean | null | undefined) ?? null
    : update.correct;

  await admin.from("student_knowledge_nodes").upsert(
    {
      user_id: userId,
      subject,
      topic,
      subtopic,
      skill_node_id: skillNodeId,
      mastery_score: newScore,
      attempts: currentAttempts + 1,
      correct: currentCorrect + (update.correct ? 1 : 0),
      correct_streak: newStreak,
      first_attempt_correct: firstAttemptCorrect,
      last_seen_at: now,
    },
    { onConflict: "user_id,skill_node_id" }
  );

  await admin.from("quest_topic_tags").upsert(
    {
      quest_id: questId,
      user_id: userId,
      subject,
      topic,
      subtopic,
      correct: update.correct,
      skill_node_id: skillNodeId,
    },
    { onConflict: "quest_id,user_id,subject,topic,subtopic" }
  );
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/** Fetch all knowledge nodes for the current student. */
export async function getMyKnowledgeGraph(): Promise<{
  nodes: KnowledgeNode[];
  tree: SubjectEntry[];
  recommendations: NextStepRecommendation[];
}> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("student_knowledge_nodes")
    .select("*")
    .eq("user_id", user.id)
    .order("subject")
    .order("topic")
    .order("subtopic");

  if (error) throw new Error(error.message);

  const nodes = (data ?? []).map((r) => rowToNode(r as Record<string, unknown>));
  const tree = buildKnowledgeTree(nodes);
  const recommendations = buildNextStepRecommendations(nodes);

  return { nodes, tree, recommendations };
}

/** Fetch knowledge graph for a specific student (tutor/admin view). */
export async function getStudentKnowledgeGraph(studentId: string): Promise<{
  nodes: KnowledgeNode[];
  tree: SubjectEntry[];
  recommendations: NextStepRecommendation[];
  adaptiveContext: AdaptiveContext;
}> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("student_knowledge_nodes")
    .select("*")
    .eq("user_id", studentId)
    .order("subject")
    .order("topic")
    .order("subtopic");

  if (error) throw new Error(error.message);

  const nodes = (data ?? []).map((r) => rowToNode(r as Record<string, unknown>));
  const tree = buildKnowledgeTree(nodes);
  const recommendations = buildNextStepRecommendations(nodes);
  const adaptiveContext = buildAdaptiveContext(nodes);

  return { nodes, tree, recommendations, adaptiveContext };
}

/** Build adaptive context for a user — used by pre-session brief and quest generation. */
export async function getAdaptiveContextForUser(userId: string): Promise<AdaptiveContext> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("student_knowledge_nodes")
    .select("*")
    .eq("user_id", userId)
    .order("mastery_score", { ascending: true })
    .limit(60);

  const nodes = (data ?? []).map((r) => rowToNode(r as Record<string, unknown>));
  return buildAdaptiveContext(nodes);
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update mastery scores for a set of topic tags after a quest attempt.
 * Called after each question answered (MCQ) or graded (written).
 *
 * Uses upsert with ELO-style mastery delta (see knowledge-graph.ts).
 * Each subject/topic/subtopic tuple is processed individually.
 */
export async function updateKnowledgeGraph(
  userId: string,
  questId: string,
  updates: KnowledgeNodeUpdate[]
): Promise<void> {
  if (updates.length === 0) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  for (const update of updates) {
    const { subject, topic, subtopic, correct } = update;
    if (!subject?.trim() || !topic?.trim() || !subtopic?.trim()) continue;

    if (isApCalculusAbSubject(subject) && update.skillNodeId) {
      await upsertApCalcSkillNode(admin, userId, questId, update, now);
      continue;
    }

    // Fetch existing node
    const { data: existing } = await admin
      .from("student_knowledge_nodes")
      .select("mastery_score, attempts, correct, correct_streak")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("topic", topic)
      .eq("subtopic", subtopic)
      .maybeSingle();

    const currentScore = (existing?.mastery_score as number | null) ?? 0;
    const currentStreak = (existing?.correct_streak as number | null) ?? 0;
    const currentAttempts = (existing?.attempts as number | null) ?? 0;
    const currentCorrect = (existing?.correct as number | null) ?? 0;

    const { newScore, newStreak } = computeMasteryDelta(currentScore, correct, currentStreak);

    await admin.from("student_knowledge_nodes").upsert(
      {
        user_id: userId,
        subject,
        topic,
        subtopic,
        mastery_score: newScore,
        attempts: currentAttempts + 1,
        correct: currentCorrect + (correct ? 1 : 0),
        correct_streak: newStreak,
        last_seen_at: now,
      },
      { onConflict: "user_id,subject,topic,subtopic" }
    );

    // Tag this quest with the topic update for history
    await admin.from("quest_topic_tags").upsert(
      {
        quest_id: questId,
        user_id: userId,
        subject,
        topic,
        subtopic,
        correct,
        skill_node_id: update.skillNodeId ?? null,
      },
      { onConflict: "quest_id,user_id,subject,topic,subtopic" }
    );
  }
}

/**
 * Extract topic tags from a practice pack result and update the knowledge graph.
 * Called after finalizePracticeQuest.
 *
 * Infers subject/topic from the quest's subject metadata and the question's tags.
 */
export async function updateKnowledgeGraphFromPracticeResult(params: {
  userId: string;
  questId: string;
  subject: string;
  topic: string;
  answers: Array<{
    questionId: string;
    correct: boolean;
    subtopicHint?: string;
  }>;
}): Promise<void> {
  const updates: KnowledgeNodeUpdate[] = params.answers.map((a) => ({
    subject: params.subject,
    topic: params.topic,
    subtopic: a.subtopicHint?.trim() || "General",
    correct: a.correct,
  }));

  await updateKnowledgeGraph(params.userId, params.questId, updates);
}

/**
 * Get the last 3 quest subtopics seen by a user (for "don't repeat" context in adaptive prompts).
 */
export async function getRecentQuestSubtopics(userId: string): Promise<string[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("quest_topic_tags")
    .select("subtopic")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (!data) return [];
  return [...new Set((data as { subtopic: string }[]).map((r) => r.subtopic))].slice(0, 9);
}

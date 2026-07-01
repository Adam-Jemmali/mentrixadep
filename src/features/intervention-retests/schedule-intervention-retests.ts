import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";
import {
  addInterventionRetestDelay,
  type InterventionSourceType,
} from "@/features/intervention-retests/schedule-intervention-retests-pure";
import { resolveApCalcAbSkillNodeForConcept } from "@/features/breakthrough-events/resolve-skill-node";

type ScheduleRow = {
  source_type: InterventionSourceType;
  source_id: string;
  user_id: string;
  skill_node_id: string;
  scheduled_for: string;
  pre_accuracy: number | null;
};

async function loadPreAccuracies(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  skillNodeIds: string[],
): Promise<Map<string, number>> {
  if (skillNodeIds.length === 0) return new Map();

  const { data } = await admin
    .from("student_node_rolling_stats")
    .select("skill_node_id, rolling_accuracy")
    .eq("user_id", userId)
    .in("skill_node_id", skillNodeIds);

  const out = new Map<string, number>();
  for (const row of data ?? []) {
    out.set(String(row.skill_node_id), Number(row.rolling_accuracy));
  }
  return out;
}

async function insertInterventionRetests(
  admin: ReturnType<typeof createAdminClient>,
  rows: ScheduleRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  let scheduled = 0;
  for (const row of rows) {
    const { error } = await admin.from("intervention_retests").insert(row);
    if (!error) {
      scheduled += 1;
      continue;
    }
    if (error.code === "23505") continue;
    console.error("[insertInterventionRetests]", error.message, row);
  }
  return scheduled;
}

export async function scheduleInterventionRetestsForNodes(params: {
  sourceType: InterventionSourceType;
  sourceId: string;
  userId: string;
  skillNodeIds: string[];
  scheduledAt: string;
}): Promise<number> {
  const uniqueNodeIds = [...new Set(params.skillNodeIds.filter(Boolean))];
  if (uniqueNodeIds.length === 0) return 0;

  const admin = createAdminClient();
  const preByNode = await loadPreAccuracies(admin, params.userId, uniqueNodeIds);

  const rows: ScheduleRow[] = uniqueNodeIds.map((skillNodeId) => ({
    source_type: params.sourceType,
    source_id: params.sourceId,
    user_id: params.userId,
    skill_node_id: skillNodeId,
    scheduled_for: params.scheduledAt,
    pre_accuracy: preByNode.get(skillNodeId) ?? null,
  }));

  return insertInterventionRetests(admin, rows);
}

export async function scheduleSessionCompletionRetests(params: {
  sessionId: string;
  studentId: string;
  course: string;
  completedAt: string;
}): Promise<number> {
  if (!isApCalculusAbSubject(params.course)) return 0;

  const admin = createAdminClient();
  const { data: targets } = await admin
    .from("session_target_nodes")
    .select("skill_node_id")
    .eq("session_id", params.sessionId);

  const skillNodeIds = (targets ?? []).map((row) => String(row.skill_node_id));
  if (skillNodeIds.length === 0) return 0;

  const scheduledFor = addInterventionRetestDelay(
    new Date(params.completedAt),
    "session",
  ).toISOString();

  return scheduleInterventionRetestsForNodes({
    sourceType: "session",
    sourceId: params.sessionId,
    userId: params.studentId,
    skillNodeIds,
    scheduledAt: scheduledFor,
  });
}

export async function scheduleStudioPackageRetests(params: {
  sessionId: string;
  studentId: string;
  skillNodeIds: string[];
  publishedAt: string;
}): Promise<number> {
  const scheduledFor = addInterventionRetestDelay(
    new Date(params.publishedAt),
    "studio_package",
  ).toISOString();

  return scheduleInterventionRetestsForNodes({
    sourceType: "studio_package",
    sourceId: params.sessionId,
    userId: params.studentId,
    skillNodeIds: params.skillNodeIds,
    scheduledAt: scheduledFor,
  });
}

export async function scheduleBreakthroughRetest(params: {
  eventId: string;
  studentId: string;
  subject: string;
  concept: string;
  detectedAt?: string;
}): Promise<number> {
  if (!isApCalculusAbSubject(params.subject)) return 0;

  const admin = createAdminClient();
  const match = await resolveApCalcAbSkillNodeForConcept(admin, params.concept);
  if (!match) return 0;

  const detectedAt = params.detectedAt ?? new Date().toISOString();
  const scheduledFor = addInterventionRetestDelay(
    new Date(detectedAt),
    "breakthrough",
  ).toISOString();

  return scheduleInterventionRetestsForNodes({
    sourceType: "breakthrough",
    sourceId: params.eventId,
    userId: params.studentId,
    skillNodeIds: [match.id],
    scheduledAt: scheduledFor,
  });
}

export async function scheduleDuelLossRetest(params: {
  duelId: string;
  studentId: string;
  skillNodeId: string;
  completedAt: string;
}): Promise<number> {
  const scheduledFor = addInterventionRetestDelay(
    new Date(params.completedAt),
    "duel_loss",
  ).toISOString();

  return scheduleInterventionRetestsForNodes({
    sourceType: "duel_loss",
    sourceId: params.duelId,
    userId: params.studentId,
    skillNodeIds: [params.skillNodeId],
    scheduledAt: scheduledFor,
  });
}

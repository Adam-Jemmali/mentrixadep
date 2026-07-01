import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { isInterventionRetestDue } from "@/features/intervention-retests/schedule-intervention-retests-pure";

export type SessionBreakthroughLine = {
  nodeName: string;
  guideName: string;
};

type SkillNodeRef = { node_name: string };

type SessionTargetRow = {
  pre_session_correct: boolean | null;
  post_session_correct: boolean | null;
  post_session_checked_at: string | null;
  skill_nodes: SkillNodeRef | SkillNodeRef[] | null;
};

export function preSessionWasNotCorrect(pre: boolean | null): boolean {
  return pre !== true;
}

export function isGuaranteeEvaluationReady(
  targets: { post_session_correct: boolean | null }[],
  sessionEndTime: string,
  nowMs = Date.now(),
): boolean {
  if (targets.length !== 3) return false;
  const allPostSet = targets.every((t) => t.post_session_correct !== null);
  if (allPostSet) return true;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return nowMs >= new Date(sessionEndTime).getTime() + sevenDaysMs;
}

export function shouldRefundAccuracyGuarantee(
  targets: { pre_session_correct: boolean | null; post_session_correct: boolean | null }[]
): boolean {
  const qualifying = targets.filter((t) => preSessionWasNotCorrect(t.pre_session_correct));
  if (qualifying.length === 0) return false;
  const improved = qualifying.filter((t) => t.post_session_correct === true);
  return improved.length === 0;
}

export async function getPendingInterventionRetestNodeIds(
  userId: string,
  validNodeIds?: Set<string>,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("intervention_retests")
    .select("skill_node_id, scheduled_for")
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("scheduled_for", { ascending: true })
    .limit(24);

  const pending = (rows ?? [])
    .filter((row) => isInterventionRetestDue(row.scheduled_for as string | null))
    .map((row) => String(row.skill_node_id))
    .filter((id) => (validNodeIds ? validNodeIds.has(id) : true));

  return [...new Set(pending)];
}

/** @deprecated Use getPendingInterventionRetestNodeIds */
export async function getPendingPostSessionTargetNodeIds(
  userId: string,
  validNodeIds?: Set<string>,
): Promise<string[]> {
  return getPendingInterventionRetestNodeIds(userId, validNodeIds);
}

export async function recordPostSessionTargetResults(
  studentId: string,
  results: { skillNodeId?: string; correct: boolean }[],
): Promise<void> {
  const withNodes = results.filter(
    (row): row is { skillNodeId: string; correct: boolean } => !!row.skillNodeId,
  );
  if (withNodes.length === 0) return;

  const admin = createAdminClient();
  const sessionIds = await recentApCalcSessionIds(admin, studentId);
  if (sessionIds.length === 0) return;

  for (const result of withNodes) {
    for (const sessionId of sessionIds) {
      const { data: target } = await admin
        .from("session_target_nodes")
        .select("id")
        .eq("session_id", sessionId)
        .eq("skill_node_id", result.skillNodeId)
        .is("post_session_checked_at", null)
        .maybeSingle();

      if (!target) continue;

      const { error } = await admin
        .from("session_target_nodes")
        .update({
          post_session_correct: result.correct,
          post_session_checked_at: new Date().toISOString(),
        })
        .eq("id", target.id)
        .is("post_session_checked_at", null);

      if (!error) break;
    }
  }
}

async function recentApCalcSessionIds(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  limit = 10,
): Promise<string[]> {
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, course")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .order("end_time", { ascending: false })
    .limit(limit);

  return (sessions ?? [])
    .filter((row) => isApCalculusAbSubject(row.course))
    .map((row) => row.id);
}

function resolveNodeName(skillNodes: SessionTargetRow["skill_nodes"]): string {
  if (!skillNodes) return "Skill node";
  if (Array.isArray(skillNodes)) return skillNodes[0]?.node_name ?? "Skill node";
  return skillNodes.node_name;
}

export async function getSessionBreakthroughLines(
  studentId: string,
): Promise<SessionBreakthroughLine[]> {
  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, course, end_time, tutor_id")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .order("end_time", { ascending: false })
    .limit(10);

  for (const session of sessions ?? []) {
    if (!isApCalculusAbSubject(session.course)) continue;

    const { data: targets } = await admin
      .from("session_target_nodes")
      .select(
        "pre_session_correct, post_session_correct, skill_nodes!session_target_nodes_skill_node_id_fkey(node_name)",
      )
      .eq("session_id", session.id);

    const rows = (targets ?? []) as SessionTargetRow[];
    if (rows.length !== 3) continue;

    const allPreSet = rows.every((row) => row.pre_session_correct !== null);
    const allPostSet = rows.every((row) => row.post_session_correct !== null);
    if (!allPreSet || !allPostSet) continue;

    const flips = rows.filter(
      (row) => preSessionWasNotCorrect(row.pre_session_correct) && row.post_session_correct === true,
    );
    if (flips.length === 0) continue;

    const { data: settings } = await admin
      .from("user_settings")
      .select("display_name")
      .eq("user_id", session.tutor_id)
      .maybeSingle();

    const guideName =
      typeof settings?.display_name === "string" && settings.display_name.trim()
        ? settings.display_name.trim()
        : "your Guide";

    return flips.map((row) => ({
      nodeName: resolveNodeName(row.skill_nodes),
      guideName,
    }));
  }

  return [];
}

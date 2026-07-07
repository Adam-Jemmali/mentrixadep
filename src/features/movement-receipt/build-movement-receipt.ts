import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { resolveMasteryNodeState } from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import {
  compareGridSnapshots,
  countVerifiedNodes,
  mondayUtcWeekKey,
} from "@/features/mastery-grid/grid-history-pure";
import { loadMasteryGridHistory } from "@/features/mastery-grid/grid-snapshot-cron";
import { firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";
import { getMomentumSessionCreditsSummary } from "@/features/entitlements/session-credits";
import { loadPeerVelocityForWeek } from "@/features/comparison/load-peer-velocity";
import { loadNextPendingRetest } from "@/features/intervention-retests/retest-reads";
import { formatRetestCountdownMs } from "@/features/intervention-retests/schedule-intervention-retests-pure";
import {
  movementReceiptDataSchema,
  type MovementReceiptData,
} from "@/features/movement-receipt/types";

const MS_7D = 7 * 24 * 60 * 60 * 1000;

async function loadCurrentNodeStates(userId: string): Promise<Record<string, MasteryNodeState>> {
  const admin = createAdminClient();
  const { data: skillNodes } = await admin
    .from("skill_nodes")
    .select("id")
    .eq("subject", AP_CALC_AB_SUBJECT);

  const nodeIds = (skillNodes ?? []).map((row) => String(row.id));
  if (nodeIds.length === 0) return {};

  const [verifiedResult, knowledgeResult] = await Promise.all([
    admin
      .from("verified_first_attempts")
      .select("skill_node_id, is_correct")
      .eq("user_id", userId)
      .in("skill_node_id", nodeIds),
    admin
      .from("student_knowledge_nodes")
      .select("skill_node_id, attempts, correct")
      .eq("user_id", userId)
      .eq("subject", AP_CALC_AB_SUBJECT)
      .in("skill_node_id", nodeIds),
  ]);

  const verifiedByNode = new Map<string, { isCorrect: boolean }>();
  for (const row of verifiedResult.data ?? []) {
    verifiedByNode.set(String(row.skill_node_id), { isCorrect: row.is_correct === true });
  }

  const knowledgeByNode = new Map<string, { attempts: number; correct: number }>();
  for (const row of knowledgeResult.data ?? []) {
    if (!row.skill_node_id) continue;
    knowledgeByNode.set(String(row.skill_node_id), {
      attempts: row.attempts ?? 0,
      correct: row.correct ?? 0,
    });
  }

  const nodeStates: Record<string, MasteryNodeState> = {};
  for (const nodeId of nodeIds) {
    nodeStates[nodeId] = resolveMasteryNodeState(
      verifiedByNode.get(nodeId) ?? null,
      knowledgeByNode.get(nodeId) ?? null,
    ).state;
  }
  return nodeStates;
}

async function loadLoopsCompletedThisWeek(
  userId: string,
  weekStart: Date,
): Promise<MovementReceiptData["loops"]> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("intervention_retests")
    .select(
      "completed_at, pre_accuracy, post_accuracy, skill_nodes!intervention_retests_skill_node_id_fkey(node_name)",
    )
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .gte("completed_at", weekStart.toISOString())
    .order("completed_at", { ascending: false });

  const completed = rows ?? [];
  const latest = completed[0];
  if (!latest) {
    return {
      completedThisWeek: 0,
      latestClosedNodeName: null,
      latestPreAccuracy: null,
      latestPostAccuracy: null,
    };
  }

  const skillNodes = latest.skill_nodes as { node_name: string } | { node_name: string }[] | null;
  const nodeName = Array.isArray(skillNodes) ? skillNodes[0]?.node_name : skillNodes?.node_name;

  return {
    completedThisWeek: completed.length,
    latestClosedNodeName: nodeName ?? null,
    latestPreAccuracy: latest.pre_accuracy == null ? null : Number(latest.pre_accuracy),
    latestPostAccuracy: latest.post_accuracy == null ? null : Number(latest.post_accuracy),
  };
}

function computeGridMovement(input: {
  currentStates: Record<string, MasteryNodeState>;
  baselineStates: Record<string, MasteryNodeState>;
  newlyVerifiedThisWeek: number;
  newlyVerifiedPriorWeek: number;
}): MovementReceiptData["grid"] {
  const diff = compareGridSnapshots(input.baselineStates, input.currentStates);
  return {
    newlyVerifiedCount: input.newlyVerifiedThisWeek,
    flippedToWeakCount: diff.flippedToWeak.length,
    verifiedTotalCount: countVerifiedNodes(input.currentStates),
    priorWeekNewlyVerified: input.newlyVerifiedPriorWeek,
  };
}

async function countVerifiedFirstAttemptsInRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("verified_first_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("attempted_at", start.toISOString())
    .lt("attempted_at", end.toISOString());
  return count ?? 0;
}

function baselineStatesForWeek(
  history: Awaited<ReturnType<typeof loadMasteryGridHistory>>,
  weekStartKey: string,
): Record<string, MasteryNodeState> {
  const prior = history.find((row) => row.snapshotWeek < weekStartKey);
  if (prior) return prior.nodeStates;
  const currentWeek = history.find((row) => row.snapshotWeek === weekStartKey);
  return currentWeek?.nodeStates ?? {};
}

export async function buildMovementReceiptForStudent(
  studentId: string,
  options?: { now?: Date },
): Promise<MovementReceiptData | null> {
  const now = options?.now ?? new Date();
  const weekStartKey = mondayUtcWeekKey(now);
  const weekStart = new Date(`${weekStartKey}T00:00:00.000Z`);

  const priorWeekStart = new Date(weekStart.getTime() - MS_7D);

  const admin = createAdminClient();
  const [userResult, entitlements, creditsSummary, pendingRetest, history, currentStates, loops, newlyVerifiedThisWeek, newlyVerifiedPriorWeek] =
    await Promise.all([
      admin.from("users").select("display_name, email").eq("id", studentId).maybeSingle(),
      getStudentEntitlements(studentId),
      getMomentumSessionCreditsSummary(studentId),
      loadNextPendingRetest(studentId).catch(() => null),
      loadMasteryGridHistory(studentId, 3).catch(() => []),
      loadCurrentNodeStates(studentId),
      loadLoopsCompletedThisWeek(studentId, weekStart),
      countVerifiedFirstAttemptsInRange(studentId, weekStart, now),
      countVerifiedFirstAttemptsInRange(studentId, priorWeekStart, weekStart),
    ]);

  const verifiedTotal = countVerifiedNodes(currentStates);
  if (verifiedTotal === 0 && loops.completedThisWeek === 0 && !pendingRetest) {
    return null;
  }

  const baselineStates = baselineStatesForWeek(history, weekStartKey);
  const grid = computeGridMovement({
    currentStates,
    baselineStates,
    newlyVerifiedThisWeek,
    newlyVerifiedPriorWeek,
  });

  const displayName = userResult.data?.display_name ?? userResult.data?.email ?? "Student";
  const firstName = firstNameFromDisplayName(displayName, userResult.data?.email ?? "Student");

  let peer: MovementReceiptData["peer"] = null;
  if (hasEntitlement(entitlements, "momentum.peer_trends")) {
    peer = await loadPeerVelocityForWeek({
      userId: studentId,
      userVerifiedThisWeek: newlyVerifiedThisWeek,
      weekStart,
    }).catch(() => null);
  }

  let slaGrant: MovementReceiptData["slaGrant"] = null;
  if (entitlements.momentumActive) {
    const { data: slaRow } = await admin
      .from("momentum_sla_grants")
      .select("id, granted_at, skill_nodes!momentum_sla_grants_skill_node_id_fkey(node_name)")
      .eq("user_id", studentId)
      .gte("granted_at", weekStart.toISOString())
      .is("movement_receipt_logged_at", null)
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (slaRow) {
      const nodes = slaRow.skill_nodes as { node_name: string } | { node_name: string }[] | null;
      const nodeName = Array.isArray(nodes)
        ? nodes[0]?.node_name ?? "your target node"
        : nodes?.node_name ?? "your target node";
      slaGrant = {
        nodeName,
        grantedAt: String(slaRow.granted_at),
      };
      await admin
        .from("momentum_sla_grants")
        .update({ movement_receipt_logged_at: now.toISOString() })
        .eq("id", slaRow.id);
    }
  }

  const payload: MovementReceiptData = {
    firstName,
    weekStart: weekStartKey,
    momentumActive: entitlements.momentumActive,
    grid,
    loops,
    retest: {
      nodeName: pendingRetest?.nodeName ?? null,
      skillNodeId: pendingRetest?.skillNodeId ?? null,
      isDue: pendingRetest?.isDue ?? false,
      countdownLabel: pendingRetest
        ? pendingRetest.isDue
          ? "Due now"
          : formatRetestCountdownMs(pendingRetest.remainingMs)
        : null,
      priorityRetest: pendingRetest?.priorityRetest ?? false,
    },
    credit: {
      momentumActive: entitlements.momentumActive,
      creditsRemaining: creditsSummary.totalRemaining,
      monthlyCreditsRemaining: creditsSummary.monthlyRemaining,
      periodMonth: creditsSummary.monthlyCredit?.period_month ?? null,
    },
    packSprint: creditsSummary.packSprint,
    peer,
    slaGrant,
  };

  return movementReceiptDataSchema.parse(payload);
}

export async function studentHadMovementReceiptThisWeek(
  studentId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const weekStart = mondayUtcWeekKey(now);
  const admin = createAdminClient();
  const { data } = await admin
    .from("movement_receipts")
    .select("id")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle();
  return Boolean(data);
}

export async function listActiveStudentIdsForMovementReceipt(now: Date): Promise<string[]> {
  const admin = createAdminClient();
  const sinceIso = new Date(now.getTime() - MS_7D).toISOString();

  const { data: verifiedRows } = await admin
    .from("verified_first_attempts")
    .select("user_id")
    .gte("attempted_at", sinceIso);

  const fromVerified = new Set((verifiedRows ?? []).map((r) => String(r.user_id)));

  const { data: retestRows } = await admin
    .from("intervention_retests")
    .select("user_id")
    .gte("scheduled_for", sinceIso);

  for (const row of retestRows ?? []) {
    fromVerified.add(String(row.user_id));
  }

  const { data: students } = await admin
    .from("users")
    .select("id")
    .eq("role", "student")
    .eq("approved", true);

  return (students ?? []).map((s) => String(s.id)).filter((id) => fromVerified.has(id));
}

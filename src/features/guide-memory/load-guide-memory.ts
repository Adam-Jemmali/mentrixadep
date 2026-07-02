"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  buildGuideMemoryBlock,
  type GuideMemoryData,
} from "@/features/guide-memory/guide-memory-pure";

async function loadLastCompletedSessionWithGuide(input: {
  studentId: string;
  guideId: string;
  beforeStartTime: string;
}) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("sessions")
    .select("id, end_time")
    .eq("student_id", input.studentId)
    .eq("tutor_id", input.guideId)
    .eq("status", "completed")
    .lt("start_time", input.beforeStartTime)
    .order("end_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function loadGuideMemoryForSession(input: {
  studentId: string;
  guideId: string;
  sessionStartTime: string;
  guideName?: string;
}): Promise<GuideMemoryData | null> {
  const entitlements = await getStudentEntitlements(input.studentId);
  if (!hasEntitlement(entitlements, "momentum.guide_memory")) {
    return null;
  }

  const admin = createAdminClient();
  const lastSession = await loadLastCompletedSessionWithGuide({
    studentId: input.studentId,
    guideId: input.guideId,
    beforeStartTime: input.sessionStartTime,
  });

  const sinceIso = lastSession?.end_time
    ? String(lastSession.end_time)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: verifiedRows }, { data: retestRows }, weakest, { data: guideSettings }] =
    await Promise.all([
      admin
        .from("verified_first_attempts")
        .select("skill_nodes!inner(node_name)")
        .eq("user_id", input.studentId)
        .eq("is_correct", true)
        .gte("attempted_at", sinceIso),
      admin
        .from("intervention_retests")
        .select("completed_at, pre_accuracy, post_accuracy, delta")
        .eq("user_id", input.studentId)
        .gte("scheduled_for", sinceIso),
      getWeakestNodes(input.studentId, AP_CALC_AB_SUBJECT, 1).catch(() => []),
      admin
        .from("user_settings")
        .select("display_name")
        .eq("user_id", input.guideId)
        .maybeSingle(),
    ]);

  const verifiedNodesGained: string[] = [];
  for (const row of verifiedRows ?? []) {
    const nodes = row.skill_nodes as { node_name: string } | { node_name: string }[] | null;
    const name = Array.isArray(nodes) ? nodes[0]?.node_name : nodes?.node_name;
    if (name) verifiedNodesGained.push(name);
  }

  let retestsPassed = 0;
  let retestsFailed = 0;
  let lastImpactNodeName: string | null = null;
  let lastImpactDelta: number | null = null;

  for (const row of retestRows ?? []) {
    if (!row.completed_at) {
      retestsFailed += 1;
      continue;
    }
    const delta = row.delta == null ? null : Number(row.delta);
    if (delta != null && delta > 0) {
      retestsPassed += 1;
    } else {
      retestsFailed += 1;
    }
  }

  if (lastSession?.id) {
    const { data: targetNodes } = await admin
      .from("session_target_nodes")
      .select("skill_node_id, post_session_correct, skill_nodes(node_name)")
      .eq("session_id", lastSession.id)
      .eq("post_session_correct", true)
      .limit(1);

    const target = targetNodes?.[0];
    if (target) {
      const nodes = target.skill_nodes as { node_name: string } | { node_name: string }[] | null;
      lastImpactNodeName = Array.isArray(nodes) ? nodes[0]?.node_name ?? null : nodes?.node_name ?? null;
      const { data: retestForSession } = await admin
        .from("intervention_retests")
        .select("delta")
        .eq("source_type", "session")
        .eq("source_id", lastSession.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastImpactDelta = retestForSession?.delta == null ? null : Number(retestForSession.delta);
    }
  }

  const guideName =
    input.guideName?.trim() ||
    String(guideSettings?.display_name ?? "").trim() ||
    "your Guide";

  const block = buildGuideMemoryBlock({
    guideName,
    verifiedNodesGained,
    retestsPassed,
    retestsFailed,
    weakestOpenNode: weakest[0]?.nodeName ?? null,
    lastImpactNodeName,
    lastImpactDelta,
  });

  return {
    guideId: input.guideId,
    guideName,
    lastSessionAt: lastSession?.end_time ? String(lastSession.end_time) : null,
    verifiedNodesGained,
    retestsPassed,
    retestsFailed,
    weakestOpenNode: weakest[0]?.nodeName ?? null,
    lastImpactNodeName,
    lastImpactDelta,
    verdict: block.verdict,
    nextAction: block.nextAction,
  };
}

export async function loadGuideMemoryForViewer(input: {
  sessionId: string;
  guideId: string;
  sessionStartTime: string;
  studentId?: string;
  guideName?: string;
}): Promise<GuideMemoryData | null> {
  const user = await requireRole(["student", "admin", "tutor"]);
  const studentId = input.studentId ?? user.id;

  if (user.role === "tutor" && user.id !== input.guideId) {
    return null;
  }
  if (user.role === "student" && user.id !== studentId) {
    return null;
  }

  return loadGuideMemoryForSession({
    studentId,
    guideId: input.guideId,
    sessionStartTime: input.sessionStartTime,
    guideName: input.guideName,
  });
}

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { resolveApCalcAbSkillNodeForConcept } from "@/features/breakthrough-events/resolve-skill-node";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import {
  detectVerifiedRankTierAdvance,
  resolveLiveBoardDisplayName,
  verifiedAttemptAccuracyPct,
  type LiveBoardEventType,
} from "@/features/live-board/live-board-events-pure";

type AdminClient = ReturnType<typeof createAdminClient>;

type SkillNodeLabels = {
  id: string;
  node_name: string;
  unit_name: string;
};

type LiveBoardInsert = {
  event_type: LiveBoardEventType;
  user_id: string;
  display_name: string;
  skill_node_id?: string | null;
  node_name: string;
  unit_name: string;
  accuracy_pct?: number | null;
  new_rank_tier?: string | null;
  is_first_attempt?: boolean;
};

async function loadLiveBoardDisplayName(
  admin: AdminClient,
  userId: string,
): Promise<string> {
  const [{ data: settings }, { data: user }] = await Promise.all([
    admin.from("user_settings").select("display_name").eq("user_id", userId).maybeSingle(),
    admin.from("users").select("email").eq("id", userId).maybeSingle(),
  ]);

  return resolveLiveBoardDisplayName(
    settings?.display_name,
    user?.email ?? null,
  );
}

async function loadSkillNodeLabels(
  admin: AdminClient,
  skillNodeId: string,
): Promise<SkillNodeLabels | null> {
  const { data } = await admin
    .from("skill_nodes")
    .select("id, node_name, unit_name")
    .eq("id", skillNodeId)
    .maybeSingle();

  if (!data?.id || !data.node_name || !data.unit_name) return null;

  return {
    id: String(data.id),
    node_name: String(data.node_name),
    unit_name: String(data.unit_name),
  };
}

async function insertLiveBoardEvent(
  admin: AdminClient,
  row: LiveBoardInsert,
): Promise<void> {
  const { error } = await admin.from("live_board_events").insert({
    ...row,
    occurred_at: new Date().toISOString(),
  });

  if (error) {
    console.error("live_board_events insert failed", error.message);
  }
}

async function loadVerifiedRankAccuracy(
  admin: AdminClient,
  userId: string,
): Promise<number | null> {
  const { data } = await admin
    .from("ap_calc_verified_rank_cache")
    .select("accuracy_percent")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.accuracy_percent == null) return null;
  const value = Number(data.accuracy_percent);
  return Number.isFinite(value) ? value : null;
}

/** After a new verified first attempt row is committed. Best-effort; never throws. */
export async function publishVerifiedAttemptLiveBoardEvents(params: {
  userId: string;
  skillNodeId: string;
  isCorrect: boolean;
  priorAccuracyPercent?: number | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [displayName, nodeLabels] = await Promise.all([
      loadLiveBoardDisplayName(admin, params.userId),
      loadSkillNodeLabels(admin, params.skillNodeId),
    ]);

    if (!nodeLabels) return;

    await insertLiveBoardEvent(admin, {
      event_type: "verified_attempt",
      user_id: params.userId,
      display_name: displayName,
      skill_node_id: nodeLabels.id,
      node_name: nodeLabels.node_name,
      unit_name: nodeLabels.unit_name,
      accuracy_pct: verifiedAttemptAccuracyPct(params.isCorrect),
      is_first_attempt: true,
    });

    const newAccuracy =
      (await loadVerifiedRankAccuracy(admin, params.userId)) ??
      verifiedAttemptAccuracyPct(params.isCorrect);

    const { advanced, newLevel } = detectVerifiedRankTierAdvance(
      params.priorAccuracyPercent,
      newAccuracy,
    );

    if (!advanced) return;

    const tierName = normalizeRankTitle(getAccountRankByLevel(newLevel).title);

    await insertLiveBoardEvent(admin, {
      event_type: "rank_advance",
      user_id: params.userId,
      display_name: displayName,
      skill_node_id: nodeLabels.id,
      node_name: nodeLabels.node_name,
      unit_name: nodeLabels.unit_name,
      new_rank_tier: tierName,
      is_first_attempt: false,
    });
  } catch (err) {
    console.error(
      "publishVerifiedAttemptLiveBoardEvents failed",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/** After breakthrough_events insert. Best-effort; never throws. */
export async function publishBreakthroughLiveBoardEvent(params: {
  studentId: string;
  subject: string;
  concept: string;
  accuracyAfter: number;
}): Promise<void> {
  if (!isApCalculusAbSubject(params.subject)) return;

  try {
    const admin = createAdminClient();
    const [displayName, resolvedNode] = await Promise.all([
      loadLiveBoardDisplayName(admin, params.studentId),
      resolveApCalcAbSkillNodeForConcept(admin, params.concept),
    ]);

    let nodeName = params.concept.trim();
    let unitName = params.subject.trim();
    let skillNodeId: string | null = null;

    if (resolvedNode) {
      nodeName = resolvedNode.node_name;
      skillNodeId = resolvedNode.id;
      const labels = await loadSkillNodeLabels(admin, resolvedNode.id);
      if (labels) unitName = labels.unit_name;
    }

    await insertLiveBoardEvent(admin, {
      event_type: "breakthrough",
      user_id: params.studentId,
      display_name: displayName,
      skill_node_id: skillNodeId,
      node_name: nodeName,
      unit_name: unitName,
      accuracy_pct: params.accuracyAfter,
      is_first_attempt: false,
    });
  } catch (err) {
    console.error(
      "publishBreakthroughLiveBoardEvent failed",
      err instanceof Error ? err.message : String(err),
    );
  }
}

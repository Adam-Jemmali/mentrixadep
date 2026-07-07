import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { resolveApCalcAbSkillNodeForConcept } from "@/features/breakthrough-events/resolve-skill-node";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { normalizeArenaAvatarUrl } from "@/features/live-board/live-board-avatar-pure";
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
  avatar_url?: string | null;
  skill_node_id?: string | null;
  node_name: string;
  unit_name: string;
  accuracy_pct?: number | null;
  new_rank_tier?: string | null;
  is_first_attempt?: boolean;
};

async function loadLiveBoardPersona(
  admin: AdminClient,
  userId: string,
): Promise<{ displayName: string; avatarUrl: string | null }> {
  const [{ data: settings }, { data: user }] = await Promise.all([
    admin.from("user_settings").select("display_name, avatar_url").eq("user_id", userId).maybeSingle(),
    admin.from("users").select("email").eq("id", userId).maybeSingle(),
  ]);

  return {
    displayName: resolveLiveBoardDisplayName(
      settings?.display_name,
      user?.email ?? null,
    ),
    avatarUrl: normalizeArenaAvatarUrl(settings?.avatar_url as string | null | undefined),
  };
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

async function loadVerifiedRankSnapshot(
  admin: AdminClient,
  userId: string,
): Promise<{ accuracyPercent: number | null; percentile: number | null }> {
  const { data } = await admin
    .from("ap_calc_verified_rank_cache")
    .select("accuracy_percent, percentile")
    .eq("user_id", userId)
    .maybeSingle();

  const accuracyPercent =
    data?.accuracy_percent == null ? null : Number(data.accuracy_percent);
  const percentile = data?.percentile == null ? null : Number(data.percentile);

  return {
    accuracyPercent: Number.isFinite(accuracyPercent) ? accuracyPercent : null,
    percentile: Number.isFinite(percentile) ? percentile : null,
  };
}

/** After a new verified first attempt row is committed. Best-effort; never throws. */
export async function publishVerifiedAttemptLiveBoardEvents(params: {
  userId: string;
  skillNodeId: string;
  isCorrect: boolean;
  priorPercentile?: number | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [persona, nodeLabels] = await Promise.all([
      loadLiveBoardPersona(admin, params.userId),
      loadSkillNodeLabels(admin, params.skillNodeId),
    ]);

    if (!nodeLabels) return;

    await insertLiveBoardEvent(admin, {
      event_type: "verified_attempt",
      user_id: params.userId,
      display_name: persona.displayName,
      avatar_url: persona.avatarUrl,
      skill_node_id: nodeLabels.id,
      node_name: nodeLabels.node_name,
      unit_name: nodeLabels.unit_name,
      accuracy_pct: verifiedAttemptAccuracyPct(params.isCorrect),
      is_first_attempt: true,
    });

    const newSnapshot = await loadVerifiedRankSnapshot(admin, params.userId);

    const { advanced, newLevel } = detectVerifiedRankTierAdvance(
      params.priorPercentile,
      newSnapshot.percentile,
    );

    if (!advanced) return;

    const tierName = normalizeRankTitle(getAccountRankByLevel(newLevel).title);

    await insertLiveBoardEvent(admin, {
      event_type: "rank_advance",
      user_id: params.userId,
      display_name: persona.displayName,
      avatar_url: persona.avatarUrl,
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
    const [persona, resolvedNode] = await Promise.all([
      loadLiveBoardPersona(admin, params.studentId),
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
      display_name: persona.displayName,
      avatar_url: persona.avatarUrl,
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

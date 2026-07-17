import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { resolveApCalcAbSkillNodeForConcept } from "@/features/breakthrough-events/resolve-skill-node";
import { normalizeRankTitle } from "@/features/xp/rank-icons";
import { normalizeArenaAvatarUrl } from "@/features/live-board/live-board-avatar-pure";
import {
  formatDivisionWarResultHeadline,
  resolveLiveBoardDisplayName,
  verifiedAttemptAccuracyPct,
} from "@/features/live-board/live-board-events-pure";
import { formatDivisionWarScoreLine } from "@/features/live-board/live-board-messages-pure";
import type { LiveBoardEventType } from "@/features/live-board/types";
import { isE2ESyntheticAccount } from "@/shared/core/e2e-synthetic-account-pure";

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
): Promise<{ displayName: string; avatarUrl: string | null; email: string | null; username: string | null } | null> {
  const [{ data: settings }, authResult] = await Promise.all([
    admin
      .from("user_settings")
      .select("display_name, avatar_url, rank_card_username")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId).catch(() => null),
  ]);

  const email = authResult?.data.user?.email?.trim().toLowerCase() ?? null;
  const username =
    typeof settings?.rank_card_username === "string" && settings.rank_card_username.trim()
      ? settings.rank_card_username.trim()
      : null;
  const displayNameRaw = (settings?.display_name as string | null) ?? null;

  if (isE2ESyntheticAccount({ email, displayName: displayNameRaw, username })) {
    return null;
  }

  return {
    displayName: resolveLiveBoardDisplayName(displayNameRaw, email, username),
    avatarUrl: normalizeArenaAvatarUrl(settings?.avatar_url as string | null | undefined),
    email,
    username,
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

async function loadMostRecentVerifiedSkillNode(
  admin: AdminClient,
  userId: string,
): Promise<SkillNodeLabels | null> {
  const { data } = await admin
    .from("verified_first_attempts")
    .select("skill_node_id")
    .eq("user_id", userId)
    .order("attempted_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!data?.skill_node_id) return null;
  return loadSkillNodeLabels(admin, String(data.skill_node_id));
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

/** After a new verified first attempt row is committed. Best-effort; never throws. */
export async function publishVerifiedAttemptLiveBoardEvent(params: {
  userId: string;
  skillNodeId: string;
  isCorrect: boolean;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [persona, nodeLabels] = await Promise.all([
      loadLiveBoardPersona(admin, params.userId),
      loadSkillNodeLabels(admin, params.skillNodeId),
    ]);

    if (!persona || !nodeLabels) return;

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
  } catch (err) {
    console.error(
      "publishVerifiedAttemptLiveBoardEvent failed",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/** After applyXpAward detects an account rank tier advance. Best-effort; never throws. */
export async function publishRankAdvanceLiveBoardEvent(params: {
  userId: string;
  newRankTier: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [persona, nodeLabels] = await Promise.all([
      loadLiveBoardPersona(admin, params.userId),
      loadMostRecentVerifiedSkillNode(admin, params.userId),
    ]);

    const tierName = normalizeRankTitle(params.newRankTier.trim());
    if (!persona || !tierName) return;

    await insertLiveBoardEvent(admin, {
      event_type: "rank_advance",
      user_id: params.userId,
      display_name: persona.displayName,
      avatar_url: persona.avatarUrl,
      skill_node_id: nodeLabels?.id ?? null,
      node_name: nodeLabels?.node_name ?? "Latest skill",
      unit_name: nodeLabels?.unit_name ?? "AP Calculus AB",
      new_rank_tier: tierName,
      is_first_attempt: false,
    });
  } catch (err) {
    console.error(
      "publishRankAdvanceLiveBoardEvent failed",
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

    if (!persona) return;

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

/** After division-war-resolve cron picks a winner. Best-effort; never throws. */
export async function publishDivisionWarResultLiveBoardEvent(params: {
  representativeUserId: string;
  winnerDivisionName: string;
  loserDivisionName: string;
  winnerPoints: number;
  loserPoints: number;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const headline = formatDivisionWarResultHeadline(
      params.winnerDivisionName,
      params.loserDivisionName,
    );
    const scoreLine = formatDivisionWarScoreLine(
      params.winnerDivisionName,
      params.winnerPoints,
      params.loserDivisionName,
      params.loserPoints,
    );

    await insertLiveBoardEvent(admin, {
      event_type: "division_war_result",
      user_id: params.representativeUserId,
      display_name: headline,
      node_name: params.winnerDivisionName.trim() || "Division",
      unit_name: scoreLine,
      accuracy_pct: params.winnerPoints,
      is_first_attempt: false,
    });
  } catch (err) {
    console.error(
      "publishDivisionWarResultLiveBoardEvent failed",
      err instanceof Error ? err.message : String(err),
    );
  }
}

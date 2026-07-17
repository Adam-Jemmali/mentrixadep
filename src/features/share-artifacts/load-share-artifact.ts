import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getSiteUrl } from "@/shared/core/site";
import {
  formatShareAccuracy,
  rankSharePath,
} from "@/features/share-artifacts/before-after-pure";

export type BeforeAfterShareArtifact = {
  id: string;
  nodeName: string;
  beforeValue: number;
  afterValue: number;
  guideName: string | null;
  imageUrl: string | null;
  shareToken: string;
  createdAt: string;
  rankUsername: string | null;
  shareUrl: string;
  ogImageUrl: string;
  rankUrl: string | null;
};

export async function loadBeforeAfterShareByToken(
  token: string,
): Promise<BeforeAfterShareArtifact | null> {
  const trimmed = token.trim();
  if (trimmed.length < 8) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_share_artifact_by_token", {
    p_token: trimmed,
  });

  if (error) {
    console.error("[loadBeforeAfterShareByToken]", error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const r = row as Record<string, unknown>;
  if (String(r.artifact_type) !== "before_after") return null;

  const site = getSiteUrl().replace(/\/$/, "");
  const shareToken = String(r.share_token);
  const rankUsername =
    typeof r.rank_card_username === "string" ? r.rank_card_username : null;
  const rankPath = rankSharePath(rankUsername);

  return {
    id: String(r.id),
    nodeName: String(r.node_name ?? "this skill"),
    beforeValue: Number(r.before_value ?? 0),
    afterValue: Number(r.after_value ?? 0),
    guideName: typeof r.guide_name === "string" ? r.guide_name : null,
    imageUrl: typeof r.image_url === "string" ? r.image_url : null,
    shareToken,
    createdAt: String(r.created_at),
    rankUsername,
    shareUrl: `${site}/share/${shareToken}`,
    ogImageUrl: `${site}/api/og/before-after?token=${encodeURIComponent(shareToken)}`,
    rankUrl: rankPath ? `${site}${rankPath}` : null,
  };
}

export function beforeAfterDisplayLabels(artifact: BeforeAfterShareArtifact) {
  return {
    beforeLabel: formatShareAccuracy(artifact.beforeValue),
    afterLabel: formatShareAccuracy(artifact.afterValue),
  };
}

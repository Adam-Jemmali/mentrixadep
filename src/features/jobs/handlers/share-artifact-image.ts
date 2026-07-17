import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getSiteUrl } from "@/shared/core/site";

export type ShareArtifactImageJobPayload = {
  artifactId: string;
  shareToken: string;
};

/** Persist OG image URL on the artifact row. */
export async function handleShareArtifactImageJob(
  payload: ShareArtifactImageJobPayload,
): Promise<void> {
  const artifactId = payload.artifactId?.trim();
  const shareToken = payload.shareToken?.trim();
  if (!artifactId || !shareToken) {
    throw new Error("image.share_artifact requires artifactId and shareToken");
  }

  const site = getSiteUrl().replace(/\/$/, "");
  const imageUrl = `${site}/api/og/before-after?token=${encodeURIComponent(shareToken)}`;

  const admin = createAdminClient();
  const { error } = await admin
    .from("share_artifacts")
    .update({ image_url: imageUrl })
    .eq("id", artifactId);

  if (error) throw new Error(error.message);
}

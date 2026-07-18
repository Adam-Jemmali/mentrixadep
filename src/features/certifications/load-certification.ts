import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { getSiteUrl } from "@/shared/core/site";
import {
  certificationVerifyPath,
  type CertificationEligibilityInput,
} from "@/features/certifications/certification-pure";
import { requireRole } from "@/shared/core/auth";

export type MentrixaCertificationView = {
  id: string;
  subject: string;
  issuedAt: string;
  verifiedPercentile: number;
  nodesVerified: number;
  totalNodes: number;
  accuracyOverall: number;
  verificationToken: string;
  verifyUrl: string;
  revokedAt: string | null;
  revokeReason: string | null;
  displayName: string;
  rankUsername: string | null;
  rankCardUrl: string | null;
};

function mapCert(
  row: Record<string, unknown>,
  displayName: string,
  rankUsername: string | null,
): MentrixaCertificationView {
  const token = String(row.verification_token);
  const site = getSiteUrl().replace(/\/$/, "");
  const rankCardUrl = rankUsername ? `${site}/rank/${encodeURIComponent(rankUsername)}` : null;
  return {
    id: String(row.id),
    subject: String(row.subject),
    issuedAt: String(row.issued_at),
    verifiedPercentile: Number(row.verified_percentile),
    nodesVerified: Number(row.nodes_verified),
    totalNodes: Number(row.total_nodes),
    accuracyOverall: Number(row.accuracy_overall),
    verificationToken: token,
    verifyUrl: `${site}${certificationVerifyPath(token)}`,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    revokeReason: row.revoke_reason ? String(row.revoke_reason) : null,
    displayName,
    rankUsername,
    rankCardUrl,
  };
}

export async function loadCertificationByToken(
  token: string,
): Promise<MentrixaCertificationView | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("mentrixa_certifications")
    .select("*")
    .eq("verification_token", trimmed)
    .maybeSingle();
  if (!data) return null;

  const userId = String(data.user_id);
  const [{ data: settings }] = await Promise.all([
    admin
      .from("user_settings")
      .select("display_name, rank_card_username")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const displayName =
    (typeof settings?.display_name === "string" && settings.display_name.trim()) ||
    "Mentrixer";
  const rankUsername =
    typeof settings?.rank_card_username === "string" && settings.rank_card_username.trim()
      ? settings.rank_card_username.trim()
      : null;

  return mapCert(data as Record<string, unknown>, displayName, rankUsername);
}

export async function loadOwnerCertification(
  userId: string,
): Promise<MentrixaCertificationView | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mentrixa_certifications")
    .select("*")
    .eq("user_id", userId)
    .eq("subject", AP_CALC_AB_SUBJECT)
    .maybeSingle();
  if (!data) return null;

  const { data: settings } = await admin
    .from("user_settings")
    .select("display_name, rank_card_username")
    .eq("user_id", userId)
    .maybeSingle();

  const displayName =
    (typeof settings?.display_name === "string" && settings.display_name.trim()) ||
    "Mentrixer";
  const rankUsername =
    typeof settings?.rank_card_username === "string" && settings.rank_card_username.trim()
      ? settings.rank_card_username.trim()
      : null;

  return mapCert(data as Record<string, unknown>, displayName, rankUsername);
}

export async function loadOwnerCertificationForViewer(): Promise<MentrixaCertificationView | null> {
  const user = await requireRole(["student", "admin"]);
  return loadOwnerCertification(user.id);
}

export type { CertificationEligibilityInput };

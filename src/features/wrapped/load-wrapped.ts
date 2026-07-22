import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  parseWrappedImageUrls,
  type WrappedReportData,
} from "@/features/wrapped/wrapped-pure";

export type WrappedReportRow = {
  id: string;
  userId: string;
  reportYear: number;
  role: "student" | "tutor";
  reportData: WrappedReportData;
  shareToken: string;
  generatedAt: string;
  imageUrls: string[];
  rankUsername: string | null;
  displayName: string;
};

function mapRow(
  row: Record<string, unknown>,
  rankUsername: string | null = null,
  displayName = "Mentrixer",
): WrappedReportRow | null {
  const role = row.role === "tutor" ? "tutor" : row.role === "student" ? "student" : null;
  if (!role) return null;
  const reportData = row.report_data as WrappedReportData | null;
  if (!reportData || typeof reportData !== "object") return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    reportYear: Number(row.report_year),
    role,
    reportData,
    shareToken: String(row.share_token),
    generatedAt: String(row.generated_at),
    imageUrls: parseWrappedImageUrls(row.image_url),
    rankUsername,
    displayName,
  };
}

async function loadWrappedProfile(
  userId: string,
): Promise<{ rankUsername: string | null; displayName: string }> {
  const admin = createAdminClient();
  const [{ data: settings }, { data: authUser }] = await Promise.all([
    admin
      .from("user_settings")
      .select("rank_card_username, display_name")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);

  const emailPrefix = authUser?.user?.email?.split("@")[0]?.trim() || "Mentrixer";
  const displayName =
    typeof settings?.display_name === "string" && settings.display_name.trim()
      ? settings.display_name.trim()
      : emailPrefix;

  const username = settings?.rank_card_username;
  const rankUsername =
    typeof username === "string" && username.trim() ? username.trim() : null;

  return { rankUsername, displayName };
}

export async function loadWrappedForOwner(
  userId: string,
  reportYear: number,
): Promise<WrappedReportRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wrapped_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_year", reportYear)
    .maybeSingle();
  if (!data) return null;
  const profile = await loadWrappedProfile(userId);
  return mapRow(data as Record<string, unknown>, profile.rankUsername, profile.displayName);
}

export async function loadWrappedByShareToken(
  shareToken: string,
): Promise<WrappedReportRow | null> {
  const token = shareToken.trim();
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("wrapped_reports")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  if (!data) return null;
  const profile = await loadWrappedProfile(String(data.user_id));
  return mapRow(data as Record<string, unknown>, profile.rankUsername, profile.displayName);
}

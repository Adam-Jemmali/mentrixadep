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
};

function mapRow(
  row: Record<string, unknown>,
  rankUsername: string | null = null,
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
  };
}

async function loadRankUsername(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select("rank_card_username")
    .eq("user_id", userId)
    .maybeSingle();
  const username = data?.rank_card_username;
  return typeof username === "string" && username.trim() ? username.trim() : null;
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
  const username = await loadRankUsername(userId);
  return mapRow(data as Record<string, unknown>, username);
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
  const username = await loadRankUsername(String(data.user_id));
  return mapRow(data as Record<string, unknown>, username);
}

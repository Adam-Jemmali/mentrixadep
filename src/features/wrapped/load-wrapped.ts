import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { WrappedReportData } from "@/features/wrapped/wrapped-pure";

export type WrappedReportRow = {
  id: string;
  userId: string;
  reportYear: number;
  role: "student" | "tutor";
  reportData: WrappedReportData;
  shareToken: string;
  generatedAt: string;
  imageUrl: string | null;
};

function mapRow(row: Record<string, unknown>): WrappedReportRow | null {
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
    imageUrl: typeof row.image_url === "string" ? row.image_url : null,
  };
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
  return mapRow(data as Record<string, unknown>);
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
  return mapRow(data as Record<string, unknown>);
}

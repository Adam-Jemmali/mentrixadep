"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  progressSnapshotDataSchema,
  type ProgressSnapshotRow,
} from "@/features/progress-snapshot/types";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";

export async function loadProgressSnapshotArchive(limit = 26): Promise<ProgressSnapshotRow[]> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!hasEntitlement(entitlements, "momentum.progress_archive")) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_snapshots")
    .select("id, student_id, snapshot_data, generated_at, email_sent_at, clicked_at")
    .eq("student_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const rows: ProgressSnapshotRow[] = [];
  for (const row of data) {
    const parsed = progressSnapshotDataSchema.safeParse(row.snapshot_data);
    if (!parsed.success) continue;
    rows.push({
      id: row.id,
      student_id: row.student_id,
      snapshot_data: parsed.data,
      generated_at: row.generated_at,
      email_sent_at: row.email_sent_at,
      clicked_at: row.clicked_at,
    });
  }
  return rows;
}

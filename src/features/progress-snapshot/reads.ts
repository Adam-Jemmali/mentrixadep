"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  progressSnapshotDataSchema,
  type ProgressSnapshotRow,
} from "@/features/progress-snapshot/types";

const SNAPSHOT_VISIBLE_MS = 7 * 24 * 60 * 60 * 1000;

/** Latest weekly snapshot still within the 7-day display window. */
export async function getActiveProgressSnapshot(): Promise<ProgressSnapshotRow | null> {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - SNAPSHOT_VISIBLE_MS).toISOString();

  const { data, error } = await supabase
    .from("progress_snapshots")
    .select("id, student_id, snapshot_data, generated_at, email_sent_at, clicked_at")
    .eq("student_id", user.id)
    .gte("generated_at", cutoff)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const parsed = progressSnapshotDataSchema.safeParse(data.snapshot_data);
  if (!parsed.success) return null;

  return {
    id: data.id,
    student_id: data.student_id,
    snapshot_data: parsed.data,
    generated_at: data.generated_at,
    email_sent_at: data.email_sent_at,
    clicked_at: data.clicked_at,
  };
}

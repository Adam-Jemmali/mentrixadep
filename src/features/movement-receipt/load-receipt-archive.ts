"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  movementReceiptDataSchema,
  type MovementReceiptRow,
} from "@/features/movement-receipt/types";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";

export async function loadMovementReceiptArchive(limit = 52): Promise<MovementReceiptRow[]> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!hasEntitlement(entitlements, "momentum.movement_receipt")) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movement_receipts")
    .select("id, student_id, week_start, receipt_data, generated_at, email_sent_at, clicked_at")
    .eq("student_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const rows: MovementReceiptRow[] = [];
  for (const row of data) {
    const parsed = movementReceiptDataSchema.safeParse(row.receipt_data);
    if (!parsed.success) continue;
    rows.push({
      id: row.id,
      student_id: row.student_id,
      week_start: String(row.week_start),
      receipt_data: parsed.data,
      generated_at: row.generated_at,
      email_sent_at: row.email_sent_at,
      clicked_at: row.clicked_at,
    });
  }
  return rows;
}

"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  buildMovementReceiptForStudent,
} from "@/features/movement-receipt/build-movement-receipt";
import {
  movementReceiptDataSchema,
  type MovementReceiptRow,
} from "@/features/movement-receipt/types";

const RECEIPT_VISIBLE_MS = 7 * 24 * 60 * 60 * 1000;

/** Latest weekly Movement Receipt within the 7-day display window, or live-built if none stored. */
export async function loadActiveMovementReceiptForViewer(): Promise<MovementReceiptRow | null> {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - RECEIPT_VISIBLE_MS).toISOString();

  const { data, error } = await supabase
    .from("movement_receipts")
    .select("id, student_id, week_start, receipt_data, generated_at, email_sent_at, clicked_at")
    .eq("student_id", user.id)
    .gte("generated_at", cutoff)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    const parsed = movementReceiptDataSchema.safeParse(data.receipt_data);
    if (parsed.success) {
      return {
        id: data.id,
        student_id: data.student_id,
        week_start: String(data.week_start),
        receipt_data: parsed.data,
        generated_at: data.generated_at,
        email_sent_at: data.email_sent_at,
        clicked_at: data.clicked_at,
      };
    }
  }

  const live = await buildMovementReceiptForStudent(user.id).catch(() => null);
  if (!live) return null;

  return {
    id: "live",
    student_id: user.id,
    week_start: live.weekStart,
    receipt_data: live,
    generated_at: new Date().toISOString(),
    email_sent_at: null,
    clicked_at: null,
  };
}

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import {
  buildMovementReceiptForStudent,
  listActiveStudentIdsForMovementReceipt,
  studentHadMovementReceiptThisWeek,
} from "@/features/movement-receipt/build-movement-receipt";
import { movementReceiptEmailSubject } from "@/features/movement-receipt/movement-receipt-pure";
import { mondayUtcWeekKey } from "@/features/mastery-grid/grid-history-pure";

export async function runSendMovementReceiptsCron() {
  const now = new Date();
  const admin = createAdminClient();
  const weekStart = mondayUtcWeekKey(now);
  const studentIds = await listActiveStudentIdsForMovementReceipt(now);

  let rows_scanned = 0;
  let rows_created = 0;
  let rows_failed = 0;
  let emails_queued = 0;

  const jobs: Parameters<typeof enqueueJobs>[0] = [];

  for (const studentId of studentIds) {
    rows_scanned += 1;
    try {
      if (await studentHadMovementReceiptThisWeek(studentId, now)) {
        continue;
      }

      const receiptData = await buildMovementReceiptForStudent(studentId, { now });
      if (!receiptData) {
        continue;
      }

      const { data: inserted, error } = await admin
        .from("movement_receipts")
        .insert({
          student_id: studentId,
          week_start: weekStart,
          receipt_data: receiptData,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        rows_failed += 1;
        continue;
      }

      rows_created += 1;

      const entitlements = await getStudentEntitlements(studentId);
      if (!entitlements.momentumActive) {
        continue;
      }

      const meta = await getCachedUserMetaBatch([studentId]);
      const email = meta[studentId]?.email;
      if (!email) continue;

      jobs.push({
        jobType: "email.send",
        idempotencyKey: `movement_receipt:${studentId}:${weekStart}`,
        payload: {
          template: "movement_receipt",
          to: email,
          data: {
            receiptId: inserted.id,
            receipt: receiptData,
            subject: movementReceiptEmailSubject(receiptData),
          },
        },
        priority: 2,
      });
      emails_queued += 1;
    } catch {
      rows_failed += 1;
    }
  }

  if (jobs.length > 0) {
    await enqueueJobs(jobs);
  }

  return {
    rows_scanned,
    rows_created,
    rows_failed,
    emails_queued,
    week_start: weekStart,
  };
}

export const GET = cronGetHandler("send-movement-receipts", runSendMovementReceiptsCron);

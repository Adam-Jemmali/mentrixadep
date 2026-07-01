import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import {
  buildProgressSnapshotForStudent,
  studentHadSnapshotThisWeek,
} from "@/features/progress-snapshot/calculate";
import { subjectLineRankPhrase } from "@/features/progress-snapshot/calculate-pure";
import { getVerdict } from "@/features/guidance/verdict-engine";
import type { ProgressSnapshotData } from "@/features/progress-snapshot/types";

const MS_7D = 7 * 24 * 60 * 60 * 1000;

async function listActiveStudentIds(now: Date): Promise<string[]> {
  const admin = createAdminClient();
  const sinceIso = new Date(now.getTime() - MS_7D).toISOString();

  const { data: xpRows } = await admin
    .from("user_xp")
    .select("user_id")
    .gte("last_activity_at", sinceIso);

  const fromXp = new Set((xpRows ?? []).map((r) => r.user_id));

  const { data: students } = await admin
    .from("users")
    .select("id")
    .eq("role", "student")
    .eq("approved", true);

  return (students ?? []).map((s) => s.id).filter((id) => fromXp.has(id));
}

export async function runSendProgressSnapshotsCron() {
  const now = new Date();
  const admin = createAdminClient();
  const studentIds = await listActiveStudentIds(now);

  let rows_scanned = 0;
  let rows_created = 0;
  let rows_failed = 0;
  let emails_queued = 0;

  const jobs: Parameters<typeof enqueueJobs>[0] = [];

  for (const studentId of studentIds) {
    rows_scanned += 1;
    try {
      if (await studentHadSnapshotThisWeek(studentId, now)) {
        continue;
      }

      const snapshotData = await buildProgressSnapshotForStudent(studentId, { now });
      if (!snapshotData) {
        continue;
      }

      const { data: inserted, error } = await admin
        .from("progress_snapshots")
        .insert({
          student_id: studentId,
          snapshot_data: snapshotData,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        rows_failed += 1;
        continue;
      }

      rows_created += 1;

      const meta = await getCachedUserMetaBatch([studentId]);
      const email = meta[studentId]?.email;
      if (!email) continue;

      const subject = `${snapshotData.firstName} — ${subjectLineRankPhrase(snapshotData.rankChange.direction)}`;
      const weekStart = now.toISOString().slice(0, 10);

      let weeklyVerdict = null;
      try {
        weeklyVerdict = await getVerdict({
          type: "weekly_snapshot",
          userId: studentId,
          context: { snapshot: snapshotData },
        });
      } catch {
        weeklyVerdict = null;
      }

      jobs.push({
        jobType: "email.send",
        idempotencyKey: `progress_snapshot:${studentId}:${weekStart}`,
        payload: {
          template: "progress_snapshot",
          to: email,
          data: {
            snapshotId: inserted.id,
            subject,
            snapshot: snapshotData,
            weeklyVerdict,
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
  };
}

export const GET = cronGetHandler("send-progress-snapshots", runSendProgressSnapshotsCron);

export type { ProgressSnapshotData };

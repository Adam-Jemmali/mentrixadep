/**
 * Annual Wrapped generation — Dec 15 cron. Deterministic. No AI.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  buildGuideWrappedData,
  buildStudentWrappedData,
  hasEnoughActivityDays,
  pickBestMonth,
  pickBestSessionDelta,
  pickBreakthroughNode,
  pickHardestNode,
  pickHighestImpactNode,
  xpAtYearStart,
  yearWindowUtc,
  type WrappedReportData,
} from "@/features/wrapped/wrapped-pure";

type Admin = ReturnType<typeof createAdminClient>;

function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function countDistinctActivityDays(
  admin: Admin,
  userId: string,
  startIso: string,
  endIso: string,
): Promise<number> {
  const days = new Set<string>();

  const [vfa, sessionsAsStudent, sessionsAsTutor] = await Promise.all([
    admin
      .from("verified_first_attempts")
      .select("attempted_at")
      .eq("user_id", userId)
      .gte("attempted_at", startIso)
      .lte("attempted_at", endIso),
    admin
      .from("sessions")
      .select("start_time")
      .eq("student_id", userId)
      .gte("start_time", startIso)
      .lte("start_time", endIso),
    admin
      .from("sessions")
      .select("start_time")
      .eq("tutor_id", userId)
      .gte("start_time", startIso)
      .lte("start_time", endIso),
  ]);

  for (const row of vfa.data ?? []) {
    const k = dayKey(row.attempted_at as string | null);
    if (k) days.add(k);
  }
  for (const row of [...(sessionsAsStudent.data ?? []), ...(sessionsAsTutor.data ?? [])]) {
    const k = dayKey(row.start_time as string | null);
    if (k) days.add(k);
  }

  return days.size;
}

async function buildStudentReport(
  admin: Admin,
  userId: string,
  reportYear: number,
): Promise<WrappedReportData | null> {
  const { startIso, endIso } = yearWindowUtc(reportYear);

  const [
    knowledge,
    nodes,
    vfaRows,
    xpRow,
    awards,
    sessions,
    settings,
    rollingEarly,
    rollingLate,
    shareRows,
  ] = await Promise.all([
    admin
      .from("student_knowledge_nodes")
      .select("skill_node_id, attempts, correct")
      .eq("user_id", userId),
    admin.from("skill_nodes").select("id, node_name"),
    admin
      .from("verified_first_attempts")
      .select("skill_node_id, accuracy_pct, attempted_at, is_correct")
      .eq("user_id", userId)
      .gte("attempted_at", startIso)
      .lte("attempted_at", endIso),
    admin.from("user_xp").select("total_xp").eq("user_id", userId).maybeSingle(),
    admin
      .from("xp_award_ledger")
      .select("xp_amount")
      .eq("user_id", userId)
      .gte("created_at", startIso),
    admin
      .from("sessions")
      .select("id")
      .eq("student_id", userId)
      .gte("start_time", startIso)
      .lte("start_time", endIso),
    admin
      .from("user_settings")
      .select("vfa_streak_longest")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("mastery_grid_snapshots")
      .select("rolling_accuracy, snapshot_week")
      .eq("user_id", userId)
      .gte("snapshot_week", `${reportYear}-01-01`)
      .lte("snapshot_week", `${reportYear}-03-31`)
      .order("snapshot_week", { ascending: true })
      .limit(4),
    admin
      .from("mastery_grid_snapshots")
      .select("rolling_accuracy, snapshot_week")
      .eq("user_id", userId)
      .gte("snapshot_week", `${reportYear}-10-01`)
      .lte("snapshot_week", `${reportYear}-12-15`)
      .order("snapshot_week", { ascending: false })
      .limit(4),
    admin
      .from("share_artifacts")
      .select("before_value, after_value, node_name, created_at, artifact_type")
      .eq("user_id", userId)
      .eq("artifact_type", "before_after")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
  ]);

  const nameById = new Map<string, string>();
  for (const n of nodes.data ?? []) {
    nameById.set(String(n.id), String(n.node_name ?? "Node"));
  }

  const hardest = pickHardestNode(
    (knowledge.data ?? []).map((row) => {
      const attempts = Number(row.attempts ?? 0);
      const correct = Number(row.correct ?? 0);
      const accuracy = attempts > 0 ? correct / attempts : 0;
      return {
        nodeName: nameById.get(String(row.skill_node_id)) ?? "Node",
        attempts,
        proficient: accuracy >= 0.7 || attempts >= 5,
      };
    }),
  );

  const earlyAcc = new Map<string, number>();
  for (const snap of [...(rollingEarly.data ?? [])].reverse()) {
    const rolling = (snap.rolling_accuracy ?? {}) as Record<string, number>;
    for (const [id, acc] of Object.entries(rolling)) {
      if (!earlyAcc.has(id)) earlyAcc.set(id, Number(acc));
    }
  }
  const lateAcc = new Map<string, number>();
  for (const snap of rollingLate.data ?? []) {
    const rolling = (snap.rolling_accuracy ?? {}) as Record<string, number>;
    for (const [id, acc] of Object.entries(rolling)) {
      if (!lateAcc.has(id)) lateAcc.set(id, Number(acc));
    }
  }
  const breakthroughRows: Array<{ nodeName: string; deltaPoints: number }> = [];
  for (const [id, late] of lateAcc) {
    const early = earlyAcc.get(id);
    if (early == null) continue;
    breakthroughRows.push({
      nodeName: nameById.get(id) ?? "Node",
      deltaPoints: late - early,
    });
  }
  const breakthrough = pickBreakthroughNode(breakthroughRows);

  const bestMonth = pickBestMonth(
    (vfaRows.data ?? [])
      .map((r) => r.attempted_at as string | null)
      .filter((v): v is string => Boolean(v)),
  );

  const awardsSum = (awards.data ?? []).reduce((s, r) => s + Number(r.xp_amount ?? 0), 0);
  const currentXp = Number(xpRow.data?.total_xp ?? 0);
  const rankStartXp = xpAtYearStart({
    currentTotalXp: currentXp,
    awardsOnOrAfterYearStart: awardsSum,
  });

  const sessionDeltas: Array<{ nodeName: string; deltaPoints: number }> = [];
  for (const row of shareRows.data ?? []) {
    const before = Number(row.before_value ?? NaN);
    const after = Number(row.after_value ?? NaN);
    const nodeName = String(row.node_name ?? "Session");
    if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
    sessionDeltas.push({ nodeName, deltaPoints: after - before });
  }

  return buildStudentWrappedData({
    hardest,
    breakthrough,
    bestMonth,
    rankStartXp,
    rankEndXp: currentXp,
    guideSessionsCount: (sessions.data ?? []).length,
    bestSessionDelta: pickBestSessionDelta(sessionDeltas),
    vfaStreakLongest: Number(settings.data?.vfa_streak_longest ?? 0),
    totalNodesVerified: (vfaRows.data ?? []).length,
  });
}

async function buildGuideReport(
  admin: Admin,
  userId: string,
  reportYear: number,
): Promise<WrappedReportData | null> {
  const { startIso, endIso } = yearWindowUtc(reportYear);

  const [sessions, portfolio, impact, payouts] = await Promise.all([
    admin
      .from("sessions")
      .select("student_id")
      .eq("tutor_id", userId)
      .gte("start_time", startIso)
      .lte("start_time", endIso),
    admin
      .from("guide_teaching_portfolio")
      .select("id")
      .eq("guide_id", userId)
      .gte("added_at", startIso)
      .lte("added_at", endIso),
    admin
      .from("guide_impact_node_scores")
      .select("node_name, impact_lift, after_accuracy, before_accuracy")
      .eq("guide_id", userId),
    admin
      .from("tutor_payout_ledger")
      .select("net_cents, created_at, session_date")
      .eq("tutor_id", userId),
  ]);

  const students = new Set(
    (sessions.data ?? [])
      .map((r) => r.student_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  let earnings = 0;
  for (const row of payouts.data ?? []) {
    const when = (row.session_date as string | null) ?? (row.created_at as string | null);
    if (!when) continue;
    if (when < startIso || when > endIso) continue;
    earnings += Number(row.net_cents ?? 0);
  }

  const impactRows = (impact.data ?? []).map((row) => {
    const lift = Number(row.impact_lift);
    const before = Number(row.before_accuracy);
    const after = Number(row.after_accuracy);
    const avgDelta = Number.isFinite(lift)
      ? lift
      : Number.isFinite(before) && Number.isFinite(after)
        ? after - before
        : 0;
    return {
      nodeName: String(row.node_name ?? "Node"),
      avgDelta,
    };
  });

  return buildGuideWrappedData({
    studentsHelped: students.size,
    totalBreakthroughs: (portfolio.data ?? []).length,
    highestImpactNode: pickHighestImpactNode(impactRows),
    totalEarningsCents: earnings,
  });
}

async function upsertWrapped(
  admin: Admin,
  userId: string,
  reportYear: number,
  role: "student" | "tutor",
  reportData: WrappedReportData,
): Promise<void> {
  const { error } = await admin.from("wrapped_reports").upsert(
    {
      user_id: userId,
      report_year: reportYear,
      role,
      report_data: reportData,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,report_year" },
  );
  if (error) {
    console.error("[generate-wrapped] upsert", userId, error.message);
  }
}

export async function runGenerateWrapped(params?: {
  reportYear?: number;
  now?: Date;
}): Promise<{ scanned: number; written: number; skipped: number }> {
  const now = params?.now ?? new Date();
  const reportYear = params?.reportYear ?? now.getUTCFullYear();
  const { startIso, endIso } = yearWindowUtc(reportYear);
  const admin = createAdminClient();

  const { data: users, error } = await admin
    .from("users")
    .select("id, role, approved")
    .eq("approved", true)
    .in("role", ["student", "tutor"]);

  if (error) {
    console.error("[generate-wrapped]", error.message);
    return { scanned: 0, written: 0, skipped: 0 };
  }

  let written = 0;
  let skipped = 0;
  const rows = users ?? [];

  for (const user of rows) {
    const userId = String(user.id);
    const role = user.role === "tutor" ? "tutor" : "student";
    const days = await countDistinctActivityDays(admin, userId, startIso, endIso);
    if (!hasEnoughActivityDays(days)) {
      skipped += 1;
      continue;
    }

    const report =
      role === "tutor"
        ? await buildGuideReport(admin, userId, reportYear)
        : await buildStudentReport(admin, userId, reportYear);

    if (!report) {
      skipped += 1;
      continue;
    }

    await upsertWrapped(admin, userId, reportYear, role, report);
    written += 1;
  }

  return { scanned: rows.length, written, skipped };
}

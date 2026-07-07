"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getAccountLevelFromTotalXp } from "@/features/xp/levels";
import {
  computeAccuracyPercent,
  duelWinRate,
  subjectsLooselyMatch,
  weekKeyFromDate,
} from "@/features/rank-card/calculate-pure";
import {
  formatVerifiedFirstAttemptSummary,
  getApCalcVerifiedRankStats,
  getCalibratedRank,
  isApCalcSubjectName,
} from "@/features/xp/calibrated-rank";
import { AP_CALC_AB_DIVISION_KEY } from "@/features/divisions/ap-calc-ab-division";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { RankCardBreakthrough, RankCardSubject } from "@/features/rank-card/types";

const MS_90D = 90 * 24 * 60 * 60 * 1000;

type QuestRow = {
  course: string;
  completedAt: string;
  correct: number;
  total: number;
};

async function loadQuestRows(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
): Promise<QuestRow[]> {
  const since = new Date(Date.now() - MS_90D).toISOString();
  const { data } = await admin
    .from("user_quest_progress")
    .select("num_attempts, last_attempt_at, quests!inner(metadata)")
    .eq("user_id", studentId)
    .eq("status", "completed")
    .gte("last_attempt_at", since)
    .order("last_attempt_at", { ascending: false })
    .limit(500);

  const rows: QuestRow[] = [];
   
  for (const row of (data as any[]) ?? []) {
    const quest = Array.isArray(row.quests) ? row.quests[0] : row.quests;
    if (!quest || !row.last_attempt_at) continue;
    const meta = quest.metadata as Record<string, unknown> | null;
    const course = typeof meta?.course === "string" ? meta.course.trim() : "General";
    let correct = 1;
    let total = row.num_attempts || 1;
    const result = meta?.result as { correct?: number; total?: number } | undefined;
    if (result?.correct !== undefined) {
      correct = result.correct;
      total = result.total || row.num_attempts || 1;
    }
    rows.push({
      course,
      completedAt: String(row.last_attempt_at),
      correct,
      total,
    });
  }
  return rows;
}

async function countAllQuestsBySubject(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
): Promise<Map<string, number>> {
  const { data } = await admin
    .from("user_quest_progress")
    .select("quests!inner(metadata)")
    .eq("user_id", studentId)
    .eq("status", "completed")
    .limit(800);

  const counts = new Map<string, number>();
   
  for (const row of (data as any[]) ?? []) {
    const quest = Array.isArray(row.quests) ? row.quests[0] : row.quests;
    const meta = quest?.metadata as Record<string, unknown> | null;
    const course = typeof meta?.course === "string" ? meta.course.trim() : "General";
    counts.set(course, (counts.get(course) ?? 0) + 1);
  }
  return counts;
}

async function divisionKeyForSubject(
  admin: ReturnType<typeof createAdminClient>,
  subject: string,
): Promise<string> {
  const { data: mappings } = await admin.from("course_division_map").select("course, divisions(key)");
  for (const row of mappings ?? []) {
    if (subjectsLooselyMatch(String(row.course), subject)) {
       
      const key = (row as any).divisions?.key ?? (row as any).divisions?.[0]?.key;
      if (key) return String(key);
    }
  }
  return AP_CALC_AB_DIVISION_KEY;
}

async function studentDuelStats(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  divisionKey: string,
  sinceIso: string,
): Promise<{ wins: number; losses: number }> {
  const { data: duels } = await admin
    .from("skill_duels")
    .select("student_id, opponent_student_id, winner, status, division_key, updated_at")
    .eq("status", "completed")
    .eq("division_key", divisionKey)
    .gte("updated_at", sinceIso)
    .or(`student_id.eq.${studentId},opponent_student_id.eq.${studentId}`);

  let wins = 0;
  let losses = 0;
  for (const d of duels ?? []) {
    if (!d.winner || d.winner === "tie") continue;
    const asStudent = d.student_id === studentId;
    const didWin = asStudent ? d.winner === "student" : d.winner === "opponent";
    if (didWin) wins += 1;
    else losses += 1;
  }
  return { wins, losses };
}

async function peerDuelWinRate(
  admin: ReturnType<typeof createAdminClient>,
  divisionKey: string,
  rankLevel: number,
  excludeUserId: string,
  sinceIso: string,
): Promise<number | null> {
  const { data: duels } = await admin
    .from("skill_duels")
    .select("student_id, opponent_student_id, winner, status")
    .eq("status", "completed")
    .eq("division_key", divisionKey)
    .gte("updated_at", sinceIso)
    .limit(400);

  if (!duels || duels.length === 0) return null;

  const participantIds = new Set<string>();
  for (const d of duels) {
    participantIds.add(d.student_id);
    if (d.opponent_student_id) participantIds.add(d.opponent_student_id);
  }
  participantIds.delete(excludeUserId);
  if (participantIds.size === 0) return null;

  const { data: xpRows } = await admin
    .from("user_xp")
    .select("user_id, total_xp")
    .in("user_id", Array.from(participantIds).slice(0, 80));

  const levelByUser = new Map<string, number>();
  for (const row of xpRows ?? []) {
    levelByUser.set(row.user_id, getAccountLevelFromTotalXp(row.total_xp ?? 0).level);
  }

  let peerWins = 0;
  let peerLosses = 0;
  for (const d of duels) {
    for (const pid of [d.student_id, d.opponent_student_id]) {
      if (!pid || pid === excludeUserId) continue;
      if (levelByUser.get(pid) !== rankLevel) continue;
      if (!d.winner || d.winner === "tie") continue;
      const asStudent = d.student_id === pid;
      const didWin = asStudent ? d.winner === "student" : d.winner === "opponent";
      if (didWin) peerWins += 1;
      else peerLosses += 1;
    }
  }

  if (peerWins + peerLosses === 0) return null;
  return duelWinRate(peerWins, peerLosses);
}

async function breakthroughsForSubject(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  subject: string,
): Promise<RankCardBreakthrough[]> {
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, course, end_time")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .order("end_time", { ascending: false })
    .limit(30);

  const events: RankCardBreakthrough[] = [];

  for (const session of sessions ?? []) {
    if (!subjectsLooselyMatch(String(session.course), subject)) continue;

    const endTime = String(session.end_time ?? "");
    const { data: preRows } = await admin
      .from("user_quest_progress")
      .select("num_attempts, last_attempt_at, quests!inner(metadata)")
      .eq("user_id", studentId)
      .eq("status", "completed")
      .lt("last_attempt_at", endTime)
      .order("last_attempt_at", { ascending: false })
      .limit(5);

    const { data: postRows } = await admin
      .from("user_quest_progress")
      .select("num_attempts, last_attempt_at, quests!inner(metadata)")
      .eq("user_id", studentId)
      .eq("status", "completed")
      .gt("last_attempt_at", endTime)
      .order("last_attempt_at", { ascending: true })
      .limit(5);

    const preScores: number[] = [];
    const postScores: number[] = [];

    const scoreFromRow = (row: Record<string, unknown>): number | null => {
      const quest = Array.isArray(row.quests) ? row.quests[0] : row.quests;
      const meta = (quest as { metadata?: Record<string, unknown> })?.metadata;
      const course = typeof meta?.course === "string" ? meta.course : "";
      if (!subjectsLooselyMatch(course, subject)) return null;
      const result = meta?.result as { correct?: number; total?: number } | undefined;
      if (result?.total) return computeAccuracyPercent(result.correct ?? 0, result.total);
      const attempts = row.num_attempts as number;
      return attempts > 0 ? Math.round(100 / attempts) : null;
    };

     
    for (const row of (preRows as any[]) ?? []) {
      const s = scoreFromRow(row);
      if (s != null) preScores.push(s);
    }
     
    for (const row of (postRows as any[]) ?? []) {
      const s = scoreFromRow(row);
      if (s != null) postScores.push(s);
    }

    if (preScores.length === 0 || postScores.length === 0) continue;
    const pre = Math.round(preScores.reduce((a, b) => a + b, 0) / preScores.length);
    const post = Math.round(postScores.reduce((a, b) => a + b, 0) / postScores.length);
    if (post <= pre) continue;

    events.push({
      date: endTime.slice(0, 10),
      concept: String(session.course),
      prePercent: pre,
      postPercent: post,
    });
    if (events.length >= 5) break;
  }

  return events;
}

function accuracyTrendFromQuests(rows: QuestRow[], subject: string): RankCardSubject["accuracyTrend"] {
  const filtered = rows.filter((r) => subjectsLooselyMatch(r.course, subject));
  const byWeek = new Map<string, { correct: number; total: number }>();

  for (const r of filtered) {
    const key = weekKeyFromDate(new Date(r.completedAt));
    const cur = byWeek.get(key) ?? { correct: 0, total: 0 };
    cur.correct += r.correct;
    cur.total += r.total;
    byWeek.set(key, cur);
  }

  const weeks: string[] = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i * 7);
    weeks.push(weekKeyFromDate(d));
  }

  return weeks.map((date) => {
    const bucket = byWeek.get(date);
    return {
      date,
      accuracy: bucket ? computeAccuracyPercent(bucket.correct, bucket.total) : 0,
    };
  });
}

export async function buildRankCardSubjects(
  studentId: string,
  _totalXp: number,
): Promise<RankCardSubject[]> {
  const admin = createAdminClient();
  const since90 = new Date(Date.now() - MS_90D).toISOString();

  const [questCounts, questRows] = await Promise.all([
    countAllQuestsBySubject(admin, studentId),
    loadQuestRows(admin, studentId),
  ]);

  const eligibleSubjects = Array.from(questCounts.entries())
    .filter(([, count]) => count > 5)
    .map(([subject]) => subject);

  const apCalcStats = await getApCalcVerifiedRankStats(studentId);
  if (
    apCalcStats.verifiedCount >= 5 &&
    !eligibleSubjects.some((subject) => isApCalcSubjectName(subject))
  ) {
    eligibleSubjects.push(AP_CALC_AB_SUBJECT);
  }

  const sortedSubjects = eligibleSubjects.sort();

  const subjects: RankCardSubject[] = [];

  for (const subject of sortedSubjects) {
    const calibrated = await getCalibratedRank(studentId, subject);
    const divisionKey = await divisionKeyForSubject(admin, subject);
    const [{ wins, losses }, peerRate, sessionCount, breakthroughs] = await Promise.all([
      studentDuelStats(admin, studentId, divisionKey, since90),
      peerDuelWinRate(admin, divisionKey, calibrated.level, studentId, since90),
      admin
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "completed")
        .ilike("course", `%${subject.slice(0, 24)}%`),
      breakthroughsForSubject(admin, studentId, subject),
    ]);

    const subjectQuests = questRows.filter((r) => subjectsLooselyMatch(r.course, subject));
    const totalCorrect = subjectQuests.reduce((s, r) => s + r.correct, 0);
    const totalQ = subjectQuests.reduce((s, r) => s + r.total, 0);
    const lastActivity = subjectQuests[0]?.completedAt ?? null;

    const verifiedSummary =
      isApCalcSubjectName(subject) && calibrated.verifiedStats
        ? formatVerifiedFirstAttemptSummary(calibrated.verifiedStats)
        : null;
    const currentAccuracy =
      isApCalcSubjectName(subject) && calibrated.verifiedStats
        ? calibrated.verifiedStats.accuracyPercent
        : computeAccuracyPercent(totalCorrect, totalQ);

    subjects.push({
      subject,
      rankTitle: calibrated.title,
      rankLevel: calibrated.level,
      accuracyTrend: accuracyTrendFromQuests(questRows, subject),
      currentAccuracy,
      duelWinRate: duelWinRate(wins, losses),
      peerDuelWinRate: peerRate,
      guideSessionsCompleted: sessionCount.count ?? 0,
      breakthroughs,
      lastActivityAt: lastActivity,
      questCount: questCounts.get(subject) ?? 0,
      verifiedFirstAttemptSummary: verifiedSummary,
    });
  }

  return subjects.sort((a, b) => b.currentAccuracy - a.currentAccuracy);
}

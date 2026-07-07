import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getEmailAppBaseUrl } from "@/shared/core/site";
import { getUtcWeekMondayString } from "@/features/divisions/division-week";
import { AP_CALC_AB_DIVISION_KEY, resolveArenaDivisionKey } from "@/features/divisions/ap-calc-ab-division";
import { firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";
import {
  computeAccuracyDelta,
  computeAccuracyPercent,
  predictNextRank,
  rankChangeDirection,
  rankFromTotalXp,
} from "@/features/progress-snapshot/calculate-pure";
import { pickImpactForSubject } from "@/features/guide-impact/impact-score-pure";
import {
  progressSnapshotDataSchema,
  type ProgressSnapshotData,
} from "@/features/progress-snapshot/types";

const MS_7D = 7 * 24 * 60 * 60 * 1000;

type QuestAccuracyBucket = { correct: number; total: number };

function weekBounds(now: Date): { thisWeekStart: Date; lastWeekStart: Date; lastWeekEnd: Date } {
  const thisWeekStart = new Date(getUtcWeekMondayString(now) + "T00:00:00.000Z");
  const lastWeekStart = new Date(thisWeekStart.getTime() - MS_7D);
  const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);
  return { thisWeekStart, lastWeekStart, lastWeekEnd };
}

function questAccuracyFromRows(
  rows: QuestAccuracyBucket[],
): number {
  const correct = rows.reduce((s, r) => s + r.correct, 0);
  const total = rows.reduce((s, r) => s + r.total, 0);
  return computeAccuracyPercent(correct, total);
}

async function resolveFocusedDivision(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ divisionKey: string; subject: string }> {
  const { data: settings } = await admin
    .from("user_settings")
    .select("focused_division_key")
    .eq("user_id", userId)
    .maybeSingle();

  let divisionKey = settings?.focused_division_key ?? null;
  if (!divisionKey) {
    divisionKey = resolveArenaDivisionKey();
  }

  const { data: division } = await admin
    .from("divisions")
    .select("name")
    .eq("key", divisionKey)
    .maybeSingle();
  const subject = division?.name?.replace(/\s+Division$/i, "").trim() || divisionKey;
  return { divisionKey, subject };
}

async function collectQuestAccuracyByWeek(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  divisionKey: string,
  thisWeekStart: Date,
  lastWeekStart: Date,
  lastWeekEnd: Date,
): Promise<{ thisWeek: QuestAccuracyBucket[]; lastWeek: QuestAccuracyBucket[] }> {
  const { data: mappings } = await admin.from("course_division_map").select("course, divisions(key)");
  const courseToDiv = new Map<string, string>();
   
  (mappings as any[])?.forEach((m) => {
    const key = m.divisions?.key || m.divisions?.[0]?.key;
    if (m.course && key) courseToDiv.set(String(m.course), String(key));
  });

  const since = lastWeekStart.toISOString();
  const { data: progressRows } = await admin
    .from("user_quest_progress")
    .select("num_attempts, last_attempt_at, quests!inner(metadata)")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("last_attempt_at", since)
    .order("last_attempt_at", { ascending: false })
    .limit(80);

  const thisWeek: QuestAccuracyBucket[] = [];
  const lastWeek: QuestAccuracyBucket[] = [];

   
  for (const row of (progressRows as any[]) ?? []) {
    const questData = Array.isArray(row.quests) ? row.quests[0] : row.quests;
    if (!questData) continue;
    const meta = questData.metadata as Record<string, unknown> | null;
    const course = typeof meta?.course === "string" ? meta.course : "";
    const questDivKey = course ? courseToDiv.get(course) ?? AP_CALC_AB_DIVISION_KEY : AP_CALC_AB_DIVISION_KEY;
    if (questDivKey !== divisionKey) continue;

    const completedAt = typeof row.last_attempt_at === "string" ? new Date(row.last_attempt_at) : null;
    if (!completedAt) continue;

    let correct = 1;
    let total = row.num_attempts || 1;
    const result = meta?.result as { correct?: number; total?: number } | undefined;
    if (result?.correct !== undefined) {
      correct = result.correct;
      total = result.total || row.num_attempts || 1;
    }

    const bucket = { correct, total };
    if (completedAt >= thisWeekStart) {
      thisWeek.push(bucket);
    } else if (completedAt >= lastWeekStart && completedAt <= lastWeekEnd) {
      lastWeek.push(bucket);
    }
  }

  return { thisWeek, lastWeek };
}

async function countXpSince(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  sinceIso: string,
): Promise<number> {
  const { data } = await admin
    .from("xp_award_ledger")
    .select("xp_amount")
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  return (data ?? []).reduce((s, r) => s + (r.xp_amount ?? 0), 0);
}

async function estimateDivisionRank(
  admin: ReturnType<typeof createAdminClient>,
  divisionKey: string,
  opts: { userId?: string; divisionXp?: number },
): Promise<number> {
  const { data: rows } = await admin
    .from("mv_division_leaderboard")
    .select("user_id, division_xp")
    .eq("division_key", divisionKey)
    .order("division_xp", { ascending: false });

  const list = rows ?? [];
  if (opts.userId) {
    const idx = list.findIndex((r) => r.user_id === opts.userId);
    if (idx >= 0) return idx + 1;
  }
  if (opts.divisionXp != null) {
    const above = list.filter((r) => (r.division_xp ?? 0) > opts.divisionXp!).length;
    return above + 1;
  }
  return list.length + 1;
}

async function getWeakestConcept(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  sinceIso: string,
  subject: string,
): Promise<{ label: string; accuracyPercent: number }> {
  const { data: nodes } = await admin
    .from("student_knowledge_nodes")
    .select("subject, topic, subtopic, mastery_score, attempts, correct, last_seen_at")
    .eq("user_id", userId)
    .gte("last_seen_at", sinceIso)
    .gt("attempts", 0)
    .order("mastery_score", { ascending: true })
    .limit(20);

  const subjectLower = subject.toLowerCase();
  const filtered = (nodes ?? []).filter((n) => {
    const subj = String(n.subject ?? n.topic ?? "").toLowerCase();
    return !subjectLower || subj.includes(subjectLower) || subjectLower.includes(subj);
  });

  const pick = filtered[0] ?? nodes?.[0];
  if (!pick) {
    return { label: `${subject} fundamentals`, accuracyPercent: 0 };
  }

  const attempts = Number(pick.attempts ?? 0);
  const correct = Number(pick.correct ?? 0);
  const label = [pick.topic, pick.subtopic].filter(Boolean).join(" · ") || `${subject} practice`;
  return {
    label: String(label),
    accuracyPercent: computeAccuracyPercent(correct, attempts),
  };
}

async function pickRecommendedGuide(params: {
  admin: ReturnType<typeof createAdminClient>;
  subject: string;
  conceptLabel: string;
  bookingBaseUrl: string;
}): Promise<ProgressSnapshotData["recommendedGuide"]> {
  const subjectNeedle = params.subject.toLowerCase().trim();
  const conceptNeedle = params.conceptLabel.toLowerCase();

  const { data: tutors } = await params.admin
    .from("tutor_courses")
    .select("tutor_id, course_name, verified")
    .eq("verified", true);

  const tutorIds = Array.from(new Set((tutors ?? []).map((t) => t.tutor_id)));
  if (tutorIds.length === 0) {
    return {
      tutorId: "00000000-0000-4000-8000-000000000000",
      displayName: "A Guide",
      impactScore: 0,
      impactSubject: params.subject,
      bookingUrl: `${params.bookingBaseUrl}/student#browse-guides`,
    };
  }

  const [{ data: settingsRows }, { data: impactRows }] = await Promise.all([
    params.admin.from("user_settings").select("user_id, display_name").in("user_id", tutorIds),
    params.admin
      .from("guide_impact_scores")
      .select("guide_id, subject, impact_score, sessions_counted")
      .in("guide_id", tutorIds),
  ]);

  const nameById = Object.fromEntries(
    (settingsRows ?? []).map((r) => [r.user_id, r.display_name as string | null]),
  );

  const impactByGuide = new Map<
    string,
    { subject: string; impactScore: number; sessionsCounted: number }[]
  >();
  for (const row of impactRows ?? []) {
    const list = impactByGuide.get(row.guide_id) ?? [];
    list.push({
      subject: row.subject,
      impactScore: Number(row.impact_score),
      sessionsCounted: row.sessions_counted,
    });
    impactByGuide.set(row.guide_id, list);
  }

  let best: ProgressSnapshotData["recommendedGuide"] | null = null;
  for (const tid of tutorIds) {
    const courses = (tutors ?? []).filter((t) => t.tutor_id === tid);
    const conceptMatch = courses.some((c) => {
      const name = c.course_name.toLowerCase();
      return (
        name.includes(subjectNeedle) ||
        subjectNeedle.includes(name) ||
        conceptNeedle.includes(name)
      );
    });
    if (!conceptMatch) continue;

    const impactEntries = impactByGuide.get(tid) ?? [];
    const matched = pickImpactForSubject(impactEntries, params.subject, params.conceptLabel);
    const impactScore = matched?.impactScore ?? 0;
    const impactSubject = matched?.subject ?? params.conceptLabel;

    const displayName = nameById[tid]?.trim() || "Guide";
    const bookingUrl = `${params.bookingBaseUrl}/student?subject=${encodeURIComponent(params.subject)}&guide=${tid}#browse-guides`;
    const candidate = { tutorId: tid, displayName, impactScore, impactSubject, bookingUrl };
    if (!best || candidate.impactScore > best.impactScore) {
      best = candidate;
    }
  }

  return (
    best ?? {
      tutorId: tutorIds[0]!,
      displayName: nameById[tutorIds[0]!]?.trim() || "Guide",
      impactScore: 0,
      impactSubject: params.conceptLabel,
      bookingUrl: `${params.bookingBaseUrl}/student#browse-guides`,
    }
  );
}

async function countDuelsThisWeek(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  sinceIso: string,
): Promise<{ won: number; lost: number }> {
  const { data: duels } = await admin
    .from("skill_duels")
    .select("student_id, opponent_student_id, winner, status, updated_at")
    .eq("status", "completed")
    .gte("updated_at", sinceIso)
    .or(`student_id.eq.${userId},opponent_student_id.eq.${userId}`);

  let won = 0;
  let lost = 0;
  for (const d of duels ?? []) {
    if (!d.winner || d.winner === "tie") continue;
    const asStudent = d.student_id === userId;
    const didWin = asStudent ? d.winner === "student" : d.winner === "opponent";
    if (didWin) won += 1;
    else lost += 1;
  }
  return { won, lost };
}

/** Build snapshot payload for one student (no DB write). */
export async function buildProgressSnapshotForStudent(
  userId: string,
  opts?: { now?: Date },
): Promise<ProgressSnapshotData | null> {
  const admin = createAdminClient();
  const now = opts?.now ?? new Date();
  const since7d = new Date(now.getTime() - MS_7D).toISOString();
  const { thisWeekStart, lastWeekStart, lastWeekEnd } = weekBounds(now);

  const [{ data: xpRow }, { data: settings }, { divisionKey, subject }] = await Promise.all([
    admin.from("user_xp").select("total_xp, division_xp, last_activity_at").eq("user_id", userId).maybeSingle(),
    admin.from("user_settings").select("display_name").eq("user_id", userId).maybeSingle(),
    resolveFocusedDivision(admin, userId),
  ]);

  const lastActivity = xpRow?.last_activity_at as string | null | undefined;
  if (!lastActivity || new Date(lastActivity).getTime() < now.getTime() - MS_7D) {
    return null;
  }

  const totalXp = xpRow?.total_xp ?? 0;
  const xpLast7 = await countXpSince(admin, userId, since7d);
  const xpBefore7 = Math.max(0, totalXp - xpLast7);

  const currentRank = rankFromTotalXp(totalXp);
  const previousRank = rankFromTotalXp(xpBefore7);
  const direction = rankChangeDirection(previousRank, currentRank);

  const { thisWeek, lastWeek } = await collectQuestAccuracyByWeek(
    admin,
    userId,
    divisionKey,
    thisWeekStart,
    lastWeekStart,
    lastWeekEnd,
  );
  const accuracyThisWeek = questAccuracyFromRows(thisWeek);
  const accuracyLastWeek = questAccuracyFromRows(lastWeek);
  const accuracyDelta = computeAccuracyDelta(
    accuracyThisWeek,
    lastWeek.length > 0 ? accuracyLastWeek : accuracyThisWeek,
  );

  const divXpMap = (xpRow?.division_xp as Record<string, number>) ?? {};
  const currentDivisionXp = divXpMap[divisionKey] ?? 0;
  const weekStart = getUtcWeekMondayString(now);
  const { data: weekRow } = await admin
    .from("division_weekly_xp")
    .select("xp_earned")
    .eq("user_id", userId)
    .eq("division_key", divisionKey)
    .eq("week_start", weekStart)
    .maybeSingle();
  const weeklyXpEarned = weekRow?.xp_earned ?? 0;

  const divisionRankCurrent = await estimateDivisionRank(admin, divisionKey, { userId });
  const previousDivisionXp = Math.max(0, currentDivisionXp - weeklyXpEarned);
  const divisionRankPrevious = await estimateDivisionRank(admin, divisionKey, {
    divisionXp: previousDivisionXp,
  });

  const { won: duelsWon, lost: duelsLost } = await countDuelsThisWeek(admin, userId, since7d);
  const weakestConcept = await getWeakestConcept(admin, userId, since7d, subject);
  const predictedNextRank = predictNextRank({ totalXp, xpEarnedLast7Days: xpLast7 });

  const appUrl = getEmailAppBaseUrl();
  const recommendedGuide = await pickRecommendedGuide({
    admin,
    subject,
    conceptLabel: weakestConcept.label,
    bookingBaseUrl: appUrl,
  });

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? "";
  const firstName = firstNameFromDisplayName(settings?.display_name ?? null, email);

  const payload: ProgressSnapshotData = {
    firstName,
    subject,
    divisionKey,
    rankChange: {
      direction,
      previous: previousRank,
      current: currentRank,
    },
    accuracyThisWeek,
    accuracyDelta,
    duelsWon,
    duelsLost,
    divisionRank: {
      current: divisionRankCurrent,
      previous: divisionRankPrevious,
      delta: divisionRankPrevious - divisionRankCurrent,
    },
    weakestConcept,
    predictedNextRank,
    recommendedGuide,
    bookingCtaUrl: recommendedGuide.bookingUrl,
  };

  return progressSnapshotDataSchema.parse(payload);
}

export async function studentHadSnapshotThisWeek(
  studentId: string,
  now = new Date(),
): Promise<boolean> {
  const admin = createAdminClient();
  const weekStart = new Date(getUtcWeekMondayString(now) + "T00:00:00.000Z").toISOString();
  const { count } = await admin
    .from("progress_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("generated_at", weekStart);
  return (count ?? 0) > 0;
}

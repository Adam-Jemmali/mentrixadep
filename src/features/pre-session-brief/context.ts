"use server";

import { z } from "zod";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getAccountLevelFromTotalXp } from "@/features/xp/levels";
import { normalizeRankTitle } from "@/features/xp/rank-icons";
import {
  buildBreakthroughMessage,
  computeAccuracyPercent,
  isGuideContextCacheFresh,
  subjectsLooselyMatch,
} from "@/features/pre-session-brief/context-pure";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { loadVerifiedGaps } from "@/features/pre-session-brief/verified-gaps";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { seedSessionTargetNodes } from "@/features/breakthrough-events/seed-session-target-nodes";
import {
  preSessionContextSchema,
  type PreSessionContext,
} from "@/features/pre-session-brief/types";
const MS_30D = 30 * 24 * 60 * 60 * 1000;

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
  guideId: z.string().uuid(),
});

type QuestBucket = { correct: number; total: number };

async function questAccuracyForWindow(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  subject: string,
  since: Date,
  until?: Date,
): Promise<number | null> {
  const { data: progressRows } = await admin
    .from("user_quest_progress")
    .select("num_attempts, last_attempt_at, quests!inner(metadata)")
    .eq("user_id", studentId)
    .eq("status", "completed")
    .gte("last_attempt_at", since.toISOString())
    .lte("last_attempt_at", (until ?? new Date()).toISOString())
    .order("last_attempt_at", { ascending: false })
    .limit(120);

  const buckets: QuestBucket[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (progressRows as any[]) ?? []) {
    const quest = Array.isArray(row.quests) ? row.quests[0] : row.quests;
    if (!quest) continue;
    const meta = quest.metadata as Record<string, unknown> | null;
    const course = typeof meta?.course === "string" ? meta.course : "";
    if (!subjectsLooselyMatch(course, subject)) continue;

    let correct = 1;
    let total = row.num_attempts || 1;
    const result = meta?.result as { correct?: number; total?: number } | undefined;
    if (result?.correct !== undefined) {
      correct = result.correct;
      total = result.total || row.num_attempts || 1;
    }
    buckets.push({ correct, total });
  }

  if (buckets.length === 0) return null;
  const correctSum = buckets.reduce((s, b) => s + b.correct, 0);
  const totalSum = buckets.reduce((s, b) => s + b.total, 0);
  return computeAccuracyPercent(correctSum, totalSum);
}

async function weakestConceptsFromTags(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  subject: string,
): Promise<{ label: string; accuracyPercent: number }[]> {
  if (isApCalculusAbSubject(subject)) {
    try {
      const weakest = await getWeakestNodes(studentId, subject, 3);
      if (weakest.length > 0) {
        return weakest.map((node) => ({
          label: `${node.unitName} · ${node.nodeName}`,
          accuracyPercent: computeAccuracyPercent(node.correctCount, node.attemptsCount),
        }));
      }
    } catch {
      /* fall through to tag-based path */
    }
  }

  const since = new Date(Date.now() - MS_30D).toISOString();
  const { data: tags } = await admin
    .from("quest_topic_tags")
    .select("subject, topic, subtopic, correct, created_at")
    .eq("user_id", studentId)
    .gte("created_at", since)
    .limit(400);

  const byConcept = new Map<string, { correct: number; total: number }>();
  for (const tag of tags ?? []) {
    if (!subjectsLooselyMatch(String(tag.subject ?? ""), subject)) continue;
    const label = [tag.topic, tag.subtopic].filter(Boolean).join(" · ") || String(tag.topic ?? "Practice");
    const cur = byConcept.get(label) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (tag.correct) cur.correct += 1;
    byConcept.set(label, cur);
  }

  if (byConcept.size === 0) {
    const { data: nodes } = await admin
      .from("student_knowledge_nodes")
      .select("topic, subtopic, subject, attempts, correct")
      .eq("user_id", studentId)
      .gt("attempts", 0)
      .order("mastery_score", { ascending: true })
      .limit(20);

    for (const n of nodes ?? []) {
      if (!subjectsLooselyMatch(String(n.subject ?? ""), subject)) continue;
      const label = [n.topic, n.subtopic].filter(Boolean).join(" · ") || `${subject} fundamentals`;
      const attempts = Number(n.attempts ?? 0);
      const correct = Number(n.correct ?? 0);
      byConcept.set(label, { correct, total: attempts });
    }
  }

  return Array.from(byConcept.entries())
    .map(([label, stats]) => ({
      label,
      accuracyPercent: computeAccuracyPercent(stats.correct, stats.total),
    }))
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
    .slice(0, 3);
}

async function duelRecordThisMonth(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  divisionKey: string | null,
): Promise<{ wins: number; losses: number }> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  let query = admin
    .from("skill_duels")
    .select("student_id, opponent_student_id, winner, status, division_key, updated_at")
    .eq("status", "completed")
    .gte("updated_at", monthStart.toISOString())
    .or(`student_id.eq.${studentId},opponent_student_id.eq.${studentId}`);

  if (divisionKey) {
    query = query.eq("division_key", divisionKey);
  }

  const { data: duels } = await query;

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

async function resolveDivisionForSubject(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  subject: string,
): Promise<{ divisionKey: string; divisionPosition: number | null }> {
  const { data: settings } = await admin
    .from("user_settings")
    .select("focused_division_key")
    .eq("user_id", studentId)
    .maybeSingle();

  let divisionKey = settings?.focused_division_key ?? null;

  const { data: mappings } = await admin.from("course_division_map").select("course, divisions(key)");
  const courseToDiv = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mappings as any[])?.forEach((m) => {
    const key = m.divisions?.key || m.divisions?.[0]?.key;
    if (m.course && key) courseToDiv.set(String(m.course), String(key));
  });

  const mapped = courseToDiv.get(subject);
  if (mapped) divisionKey = mapped;

  if (!divisionKey) {
    const { data: xp } = await admin
      .from("user_xp")
      .select("division_xp")
      .eq("user_id", studentId)
      .maybeSingle();
    const divXp = (xp?.division_xp as Record<string, number>) ?? {};
    divisionKey = Object.entries(divXp).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general";
  }

  const { data: rows } = await admin
    .from("mv_division_leaderboard")
    .select("user_id, division_xp")
    .eq("division_key", divisionKey)
    .order("division_xp", { ascending: false });

  const list = rows ?? [];
  const idx = list.findIndex((r) => r.user_id === studentId);
  return { divisionKey, divisionPosition: idx >= 0 ? idx + 1 : null };
}

async function lastSessionTopicWithGuide(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  guideId: string,
  beforeIso: string,
): Promise<string | null> {
  const { data: prior } = await admin
    .from("sessions")
    .select("id, course, start_time")
    .eq("student_id", studentId)
    .eq("tutor_id", guideId)
    .eq("status", "completed")
    .lt("start_time", beforeIso)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prior) return null;

  const { data: pkg } = await admin
    .from("session_ai_packages")
    .select("summary, follow_up_topics")
    .eq("session_id", prior.id)
    .maybeSingle();

  const topics = pkg?.follow_up_topics as string[] | null;
  if (topics?.[0]) return topics[0]!;
  if (typeof pkg?.summary === "string" && pkg.summary.trim().length > 10) {
    return pkg.summary.trim().slice(0, 120);
  }
  return String(prior.course ?? null);
}

async function buildPerformanceSummary(params: {
  admin: ReturnType<typeof createAdminClient>;
  studentId: string;
  guideId: string;
  subject: string;
  sessionStartTime: string;
}): Promise<PreSessionContext["performance"]> {
  const now = new Date();
  const last30Start = new Date(now.getTime() - MS_30D);
  const prev30Start = new Date(now.getTime() - 2 * MS_30D);

  const [
    accuracyLast30,
    accuracyPrev30,
    weakestConcepts,
    { data: xpRow },
    divisionInfo,
    lastTopic,
  ] = await Promise.all([
    questAccuracyForWindow(params.admin, params.studentId, params.subject, last30Start),
    questAccuracyForWindow(params.admin, params.studentId, params.subject, prev30Start, last30Start),
    weakestConceptsFromTags(params.admin, params.studentId, params.subject),
    params.admin.from("user_xp").select("total_xp").eq("user_id", params.studentId).maybeSingle(),
    resolveDivisionForSubject(params.admin, params.studentId, params.subject),
    lastSessionTopicWithGuide(
      params.admin,
      params.studentId,
      params.guideId,
      params.sessionStartTime,
    ),
  ]);

  const duelRecord = await duelRecordThisMonth(
    params.admin,
    params.studentId,
    divisionInfo.divisionKey,
  );

  const totalXp = xpRow?.total_xp ?? 0;
  const rank = getAccountLevelFromTotalXp(totalXp);

  return {
    questAccuracyLast30Days: accuracyLast30 ?? 0,
    questAccuracyTrendDelta:
      accuracyLast30 != null && accuracyPrev30 != null ? accuracyLast30 - accuracyPrev30 : 0,
    weakestConcepts,
    duelWins: duelRecord.wins,
    duelLosses: duelRecord.losses,
    currentRankTitle: normalizeRankTitle(rank.title),
    currentRankLevel: rank.level,
    divisionPosition: divisionInfo.divisionPosition,
    divisionKey: divisionInfo.divisionKey,
    lastSessionTopic: lastTopic,
  };
}

async function buildFreshContext(
  sessionId: string,
  guideId: string,
): Promise<PreSessionContext | null> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, student_id, tutor_id, course, start_time, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.tutor_id !== guideId) return null;
  if (session.status === "cancelled") return null;

  const studentId = session.student_id as string;
  const [{ data: settings }, { data: briefRow }] = await Promise.all([
    admin.from("user_settings").select("display_name").eq("user_id", studentId).maybeSingle(),
    admin
      .from("session_briefs")
      .select(
        "likely_coverage, weak_spots, warm_up_title, warm_up_prompt, warm_up_hint, questions_to_ask",
      )
      .eq("session_id", sessionId)
      .maybeSingle(),
  ]);

  let studentDisplayName = settings?.display_name?.trim() ?? "";
  if (!studentDisplayName) {
    const { data: authUser } = await admin.auth.admin.getUserById(studentId);
    const email = authUser?.user?.email ?? "";
    studentDisplayName = email.split("@")[0] || "Student";
  }

  const performance = await buildPerformanceSummary({
    admin,
    studentId,
    guideId,
    subject: String(session.course),
    sessionStartTime: String(session.start_time),
  });

  const { data: xpRow } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", studentId)
    .maybeSingle();

  const topWeak = performance.weakestConcepts[0];
  const breakthroughBuilt = topWeak
    ? buildBreakthroughMessage({
        conceptLabel: topWeak.label,
        currentRankTitle: performance.currentRankTitle,
        totalXp: xpRow?.total_xp ?? 0,
      })
    : null;

  const aiBrief = briefRow
    ? {
        likelyCoverage: Array.isArray(briefRow.likely_coverage)
          ? briefRow.likely_coverage.map(String)
          : [],
        weakSpotsToWatch: Array.isArray(briefRow.weak_spots)
          ? briefRow.weak_spots.map(String)
          : [],
        warmUpExercise: {
          title: String(briefRow.warm_up_title ?? "Quick warm-up"),
          prompt: String(briefRow.warm_up_prompt ?? ""),
          hint:
            typeof briefRow.warm_up_hint === "string" && briefRow.warm_up_hint.trim()
              ? briefRow.warm_up_hint
              : undefined,
        },
        questionsToAsk: Array.isArray(briefRow.questions_to_ask)
          ? briefRow.questions_to_ask.map(String)
          : [],
      }
    : null;

  const cachedAt = new Date().toISOString();
  const verifiedGaps = isApCalculusAbSubject(String(session.course))
    ? await loadVerifiedGaps(studentId, String(session.course), 3)
    : null;

  const masteryGrid = isApCalculusAbSubject(String(session.course))
    ? await loadMasteryGrid(studentId).catch(() => null)
    : null;

  let sessionTargetNodeIds: string[] | undefined;
  if (isApCalculusAbSubject(String(session.course))) {
    await seedSessionTargetNodes(sessionId, studentId, String(session.course)).catch(() => {});
    const { data: targetRows } = await admin
      .from("session_target_nodes")
      .select("skill_node_id")
      .eq("session_id", sessionId)
      .order("id", { ascending: true });
    sessionTargetNodeIds = (targetRows ?? []).map((row) => String(row.skill_node_id));
  }

  const payload: PreSessionContext = {
    sessionId,
    subject: String(session.course),
    sessionStartTime: String(session.start_time),
    studentDisplayName,
    performance,
    aiBrief,
    breakthrough: breakthroughBuilt
      ? {
          conceptLabel: topWeak!.label,
          currentRankTitle: performance.currentRankTitle,
          nextRankTitle: breakthroughBuilt.nextRankTitle,
          message: breakthroughBuilt.message,
        }
      : null,
    verifiedGaps,
    masteryGrid,
    sessionTargetNodeIds,
    cachedAt,
  };

  const parsed = preSessionContextSchema.parse(payload);

  if (briefRow) {
    await admin
      .from("session_briefs")
      .update({
        guide_context_json: parsed,
        guide_context_cached_at: cachedAt,
      })
      .eq("session_id", sessionId);
  } else {
    await admin.from("session_briefs").insert({
      session_id: sessionId,
      student_id: studentId,
      guide_context_json: parsed,
      guide_context_cached_at: cachedAt,
      likely_coverage: [],
      weak_spots: [],
      warm_up_title: "",
      warm_up_prompt: "",
      questions_to_ask: [],
    });
  }

  return parsed;
}

/**
 * Combined student performance + AI brief for a Guide before a session.
 * Cached on session_briefs for 6 hours.
 */
export async function getPreSessionContext(
  sessionId: string,
  guideId: string,
): Promise<PreSessionContext | null> {
  const user = await requireRole(["tutor", "admin"]);
  const parsed = paramsSchema.safeParse({ sessionId, guideId });
  if (!parsed.success) return null;

  if (user.role === "tutor" && user.id !== guideId) return null;

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("tutor_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.tutor_id !== guideId) return null;
  if (session.status === "cancelled") return null;

  const { data: cached } = await admin
    .from("session_briefs")
    .select("guide_context_json, guide_context_cached_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (
    cached?.guide_context_json &&
    isGuideContextCacheFresh(cached.guide_context_cached_at as string | null)
  ) {
    const result = preSessionContextSchema.safeParse(cached.guide_context_json);
    if (result.success) return result.data;
  }

  return buildFreshContext(sessionId, guideId);
}

export async function getUpcomingGuidePreSessionSessions(guideId: string) {
  await requireRole(["tutor", "admin"]);
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, course, start_time, end_time, student_id")
    .eq("tutor_id", guideId)
    .neq("status", "cancelled")
    .gte("start_time", now)
    .lte("start_time", in48h)
    .order("start_time", { ascending: true })
    .limit(8);

  return sessions ?? [];
}

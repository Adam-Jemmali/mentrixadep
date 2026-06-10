import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cacheKeys, cacheTtl, withCache } from "@/shared/core/redis";

export type LandingStatItem = {
  value: number;
  label: string;
  suffix?: string;
};

export type LandingStatsPayload = {
  stats: LandingStatItem[];
  fetchedAt: string;
};

const COMPLETED_SESSION_FILTER = "status.eq.completed,completed.eq.true";

function startOfUtcMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function rolling30DaysStart(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchLandingStatsUncached(): Promise<LandingStatsPayload> {
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const monthStart = startOfUtcMonth();
  const activitySince = rolling30DaysStart();
  const guidesWindowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    sessionsCompletedRes,
    sessionStudentsMonthRes,
    sessionStudents30Res,
    questStudentsMonthRes,
    questStudents30Res,
    liveSessionTutorsRes,
    soonAvailabilityRes,
    approvedGuidesRes,
  ] = await Promise.all([
    admin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .or(COMPLETED_SESSION_FILTER),
    admin
      .from("sessions")
      .select("student_id")
      .or(COMPLETED_SESSION_FILTER)
      .gte("end_time", monthStart),
    admin
      .from("sessions")
      .select("student_id")
      .or(COMPLETED_SESSION_FILTER)
      .gte("end_time", activitySince),
    admin
      .from("user_quest_progress")
      .select("user_id")
      .eq("status", "completed")
      .gte("last_attempt_at", monthStart),
    admin
      .from("user_quest_progress")
      .select("user_id")
      .eq("status", "completed")
      .gte("last_attempt_at", activitySince),
    admin
      .from("sessions")
      .select("tutor_id")
      .eq("status", "scheduled")
      .lte("start_time", nowIso)
      .gte("end_time", nowIso),
    admin
      .from("availability")
      .select("tutor_id")
      .gte("start_time", nowIso)
      .lte("start_time", guidesWindowEnd),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "tutor")
      .eq("approved", true),
  ]);

  const countDistinctStudents = async (userIds: Set<string>): Promise<number> => {
    if (userIds.size === 0) return 0;
    const { count, error } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .in("id", Array.from(userIds));
    if (error) {
      console.error("[landing-stats] student count failed:", error.message);
      return 0;
    }
    return count ?? 0;
  };

  const mergeStudentIds = (
    ...lists: Array<Array<{ student_id?: string | null; user_id?: string | null }>>
  ): Set<string> => {
    const ids = new Set<string>();
    for (const list of lists) {
      for (const row of list) {
        const id = row.student_id ?? row.user_id;
        if (id) ids.add(id);
      }
    }
    return ids;
  };

  const monthIds = mergeStudentIds(
    sessionStudentsMonthRes.data ?? [],
    questStudentsMonthRes.data ?? []
  );
  const rollingIds = mergeStudentIds(
    sessionStudents30Res.data ?? [],
    questStudents30Res.data ?? []
  );

  const [studentsMonth, studentsRolling] = await Promise.all([
    countDistinctStudents(monthIds),
    countDistinctStudents(rollingIds),
  ]);

  // Calendar month can be 0 early in the month; 30-day window reflects recent learning activity.
  const studentsImprovedThisMonth = studentsMonth > 0 ? studentsMonth : studentsRolling;

  const guideIds = new Set<string>();
  for (const row of liveSessionTutorsRes.data ?? []) {
    if (row.tutor_id) guideIds.add(row.tutor_id);
  }
  for (const row of soonAvailabilityRes.data ?? []) {
    if (row.tutor_id) guideIds.add(row.tutor_id);
  }

  let guidesOnlineNow = 0;
  if (guideIds.size > 0) {
    const { count, error } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "tutor")
      .eq("approved", true)
      .in("id", Array.from(guideIds));
    if (!error) guidesOnlineNow = count ?? 0;
  }

  if (guidesOnlineNow === 0 && !approvedGuidesRes.error) {
    guidesOnlineNow = approvedGuidesRes.count ?? 0;
  }

  if (sessionsCompletedRes.error) {
    console.error("[landing-stats] sessions count failed:", sessionsCompletedRes.error.message);
  }

  const sessionsCompleted = sessionsCompletedRes.error ? 0 : (sessionsCompletedRes.count ?? 0);

  return {
    fetchedAt: nowIso,
    stats: [
      { label: "active learners this month", value: studentsImprovedThisMonth },
      { label: "sessions completed", value: sessionsCompleted },
      { label: "Guides available now", value: guidesOnlineNow },
    ],
  };
}

const getLandingStatsUncachedLayer = unstable_cache(
  fetchLandingStatsUncached,
  ["landing-stats-v2"],
  { revalidate: 300 },
);

/** Cached aggregates for the marketing social-proof strip (Redis + unstable_cache). */
export async function getLandingStats(): Promise<LandingStatsPayload> {
  return withCache(cacheKeys.landingStats(), cacheTtl.landingStats, () =>
    getLandingStatsUncachedLayer(),
  );
}

"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { cacheKeys, cacheTtl, redisDel, withCache } from "@/shared/core/redis";
import {
  getPastSessions,
  getSessionRequests,
  getUpcomingSessions,
} from "@/features/booking/session-lists";

export async function getStudentSessionsHubBundle(): Promise<{
  upcomingSessions: Awaited<ReturnType<typeof getUpcomingSessions>>;
  pastSessions: Awaited<ReturnType<typeof getPastSessions>>;
  sessionRequests: Awaited<ReturnType<typeof getSessionRequests>>;
}> {
  const [upcomingSessions, pastSessions, sessionRequests] = await Promise.all([
    getUpcomingSessions(),
    getPastSessions(),
    getSessionRequests(),
  ]);

  return {
    upcomingSessions,
    pastSessions,
    sessionRequests,
  };
}


export type StudentHubSnapshot = {
  user_xp: Record<string, unknown> | null;
  user_settings: {
    display_name?: string | null;
    timezone?: string | null;
    focused_division_key?: string | null;
  } | null;
  student_courses: Array<Record<string, unknown>>;
  has_pending_requests: boolean;
  tutor_expertise: Record<
    string,
    Array<{ course_name: string; proof_description: string; verified: boolean }>
  >;
  available_courses: string[];
  in_progress_quest: {
    quest_id: string;
    prompt: string;
    num_attempts: number | null;
  } | null;
};

async function loadStudentHubSnapshot(userId: string): Promise<StudentHubSnapshot> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("student_hub_snapshot", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to load hub snapshot: ${error.message}`);
  }

  const raw = data as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") {
    return {
      user_xp: null,
      user_settings: null,
      student_courses: [],
      has_pending_requests: false,
      tutor_expertise: {},
      available_courses: [],
      in_progress_quest: null,
    };
  }

  const tutorExpertise: StudentHubSnapshot["tutor_expertise"] = {};
  const te = raw["tutor_expertise"];
  if (te && typeof te === "object" && !Array.isArray(te)) {
    for (const [tid, rows] of Object.entries(te as Record<string, unknown>)) {
      if (!Array.isArray(rows)) continue;
      tutorExpertise[tid] = rows
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const o = row as Record<string, unknown>;
          return {
            course_name: String(o.course_name ?? ""),
            proof_description: String(o.proof_description ?? ""),
            verified: Boolean(o.verified),
          };
        })
        .filter(Boolean) as StudentHubSnapshot["tutor_expertise"][string];
    }
  }

  let availableCourses: string[] = [];
  const ac = raw["available_courses"];
  if (Array.isArray(ac)) {
    availableCourses = ac.map((c) => String(c)).filter(Boolean);
  }

  let inProgress: StudentHubSnapshot["in_progress_quest"] = null;
  const ip = raw["in_progress_quest"];
  if (ip && typeof ip === "object" && !Array.isArray(ip)) {
    const o = ip as Record<string, unknown>;
    const qid = o.quest_id;
    if (typeof qid === "string" && qid) {
      inProgress = {
        quest_id: qid,
        prompt: typeof o.prompt === "string" ? o.prompt : "",
        num_attempts: typeof o.num_attempts === "number" ? o.num_attempts : null,
      };
    }
  }

  const us = raw["user_settings"];
  const userSettings =
    us && typeof us === "object" && !Array.isArray(us)
      ? (us as StudentHubSnapshot["user_settings"])
      : null;

  const sc = raw["student_courses"];
  const studentCourses = Array.isArray(sc) ? (sc as Array<Record<string, unknown>>) : [];

  return {
    user_xp: raw["user_xp"] && typeof raw["user_xp"] === "object" ? (raw["user_xp"] as Record<string, unknown>) : null,
    user_settings: userSettings,
    student_courses: studentCourses,
    has_pending_requests: Boolean(raw["has_pending_requests"]),
    tutor_expertise: tutorExpertise,
    available_courses: availableCourses,
    in_progress_quest: inProgress,
  };
}

/** One RPC round-trip: profile, courses, expertise map, availability courses, quest card, pending flag. */
export async function getStudentHubSnapshot(): Promise<StudentHubSnapshot> {
  const user = await requireRole(["student", "admin"]);
  return withCache(cacheKeys.hub(user.id), cacheTtl.hub, () =>
    loadStudentHubSnapshot(user.id),
  );
}

export async function invalidateStudentHubCache(userId: string): Promise<void> {
  await redisDel(cacheKeys.hub(userId));
}

export async function getHasPendingSessionRequests(): Promise<boolean> {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_requests")
    .select("id")
    .eq("student_id", user.id)
    .eq("status", "pending")
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}
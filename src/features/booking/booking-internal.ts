import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";

export function isMissingCancelledSessionColumnsError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return (
    m.includes("does not exist") &&
    (m.includes("cancelled_at") || m.includes("cancelled_by_role"))
  );
}

export function isMissingAvailabilityColumnsError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("does not exist") &&
    (m.includes("active") || m.includes("booking_status") || m.includes("max_students") || m.includes("series_id"))
  );
}

export function isMissingSessionHideColumnsError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return m.includes("does not exist") && (m.includes("student_hidden_at") || m.includes("tutor_hidden_at"));
}

export function isMissingStudentCoursesRelation(error: { message?: string; code?: string }): boolean {
  const m = (error.message ?? "").toLowerCase();
  const c = error.code ?? "";
  return (
    c === "42P01" ||
    c === "PGRST205" ||
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

/** Tutor display info for learner session lists (from user_settings + auth metadata). */
export type StudentSessionTutorProfile = {
  id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string;
};

export async function enrichStudentSessionsWithTutorProfiles<T extends { tutor_id: string }>(
  sessions: T[]
): Promise<Array<T & { tutor: StudentSessionTutorProfile }>> {
  if (sessions.length === 0) return [];

  const adminClient = createAdminClient();
  const tutorIds = Array.from(new Set(sessions.map((s) => s.tutor_id).filter(Boolean)));

  const { data: settingsRows } = await adminClient
    .from("user_settings")
    .select("user_id, display_name, avatar_url")
    .in("user_id", tutorIds);

  const settingsById = new Map(
    (settingsRows ?? []).map((r) => [
      r.user_id,
      {
        display_name: typeof r.display_name === "string" ? r.display_name.trim() || null : null,
        avatar_url: typeof r.avatar_url === "string" && r.avatar_url.length > 0 ? r.avatar_url : null,
      },
    ])
  );

  const cachedMeta = await getCachedUserMetaBatch(tutorIds);

  return sessions.map((session) => {
    const cached = cachedMeta[session.tutor_id];
    const settings = settingsById.get(session.tutor_id);
    return {
      ...session,
      tutor: {
        id: session.tutor_id,
        role: "tutor",
        display_name: settings?.display_name ?? cached?.displayName ?? null,
        avatar_url: settings?.avatar_url ?? null,
        email: cached?.email ?? undefined,
      },
    };
  });
}

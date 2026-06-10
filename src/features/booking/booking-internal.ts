import { createAdminClient } from "@/shared/integrations/supabase/admin";

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

  const metaById = new Map<
    string,
    { display_name: string | null; avatar_url: string | null; email: string }
  >();

  await Promise.all(
    tutorIds.map(async (id) => {
      try {
        const { data } = await adminClient.auth.admin.getUserById(id);
        const u = data?.user;
        const email = u?.email ?? "";
        const meta = u?.user_metadata as Record<string, unknown> | undefined;
        const avatarRaw = meta?.avatar_url ?? meta?.picture;
        const avatar_url =
          typeof avatarRaw === "string" && avatarRaw.length > 0 ? avatarRaw : null;
        metaById.set(id, {
          display_name: settingsById.get(id)?.display_name ?? null,
          avatar_url,
          email,
        });
      } catch {
        metaById.set(id, {
          display_name: settingsById.get(id)?.display_name ?? null,
          avatar_url: null,
          email: "",
        });
      }
    })
  );

  return sessions.map((session) => {
    const m = metaById.get(session.tutor_id);
    return {
      ...session,
      tutor: {
        id: session.tutor_id,
        role: "tutor",
        display_name: m?.display_name ?? null,
        avatar_url: settingsById.get(session.tutor_id)?.avatar_url ?? m?.avatar_url ?? null,
        email: m?.email,
      },
    };
  });
}

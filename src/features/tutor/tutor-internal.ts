import { createAdminClient } from "@/shared/integrations/supabase/admin";

/** Monday 00:00:00 UTC for the week containing `d`. */
export function utcStartOfWeekMonday(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export const STRIPE_PAYOUT_CAPTION = "";

const TUTOR_LOADER_DEBUG = true;
export function logTutorLoader(stage: string, details?: Record<string, unknown>): void {
  if (!TUTOR_LOADER_DEBUG) return;
  console.log(`[tutor-loader] ${stage}`, details ?? {});
}

export async function loadTutorSection<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[tutor] ${label} failed:`, e);
    return fallback;
  }
}

export function isMissingCancelledSessionColumnsError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return m.includes("does not exist") && (m.includes("cancelled_at") || m.includes("cancelled_by_role"));
}

export function isMissingSessionHideColumnsError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return m.includes("does not exist") && (m.includes("student_hidden_at") || m.includes("tutor_hidden_at"));
}

export function isMissingAvailabilityColumnsError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("does not exist") &&
    (m.includes("active") || m.includes("booking_status") || m.includes("max_students") || m.includes("series_id"))
  );
}

export type TutorSessionStudentProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export async function enrichTutorRowsWithStudentProfiles<T extends { student_id: string }>(
  rows: T[],
): Promise<Array<T & { student: { id: string }; student_email: string | null; student_profile: TutorSessionStudentProfile }>> {
  if (rows.length === 0) return [];
  const adminClient = createAdminClient();
  const studentIds = Array.from(new Set(rows.map((r) => r.student_id).filter(Boolean)));
  const { data: settingsRows } = await adminClient
    .from("user_settings")
    .select("user_id, display_name, avatar_url")
    .in("user_id", studentIds);
  const settingsById = new Map(
    (settingsRows ?? []).map((row) => [
      row.user_id,
      {
        display_name: typeof row.display_name === "string" ? row.display_name.trim() || null : null,
        avatar_url: typeof row.avatar_url === "string" && row.avatar_url.length > 0 ? row.avatar_url : null,
      },
    ]),
  );
  const emailById = new Map<string, string>();
  return rows.map((row) => {
    const settings = settingsById.get(row.student_id);
    const email = emailById.get(row.student_id) ?? "Learner";
    return {
      ...row,
      student: { id: row.student_id },
      student_email: email,
      student_profile: {
        id: row.student_id,
        email,
        display_name: settings?.display_name ?? "Learner",
        avatar_url: settings?.avatar_url ?? null,
      },
    };
  });
}

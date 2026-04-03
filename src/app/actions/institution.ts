"use server";

import { requireRole, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Institution, InstitutionMember, InstitutionPlan } from "@/lib/database.types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "").split("/")[0] ?? "";
}

function extractDomainFromEmail(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

/** Check whether the current user is the institution admin or a platform admin */
async function assertInstitutionAdmin(institutionId: string): Promise<void> {
  const user = await requireRole(["student", "tutor", "admin"]);
  const admin = createAdminClient();

  // Platform admin: always allowed
  if (user.role === "admin") return;

  const { data } = await admin
    .from("institution_members")
    .select("role")
    .eq("institution_id", institutionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.role !== "admin") {
    throw new Error("Not authorized to manage this institution.");
  }
}

// ─── Domain auto-association ─────────────────────────────────────────────────

/**
 * Called during signup. If the email domain matches an institution,
 * auto-adds the user as a student member (idempotent).
 */
export async function tryAutoAssociateInstitution(
  userId: string,
  email: string
): Promise<void> {
  try {
    const domain = extractDomainFromEmail(email);
    if (!domain || domain.length < 4) return;

    const admin = createAdminClient();
    const { data: inst } = await admin
      .from("institutions")
      .select("id")
      .eq("domain", domain)
      .maybeSingle();

    if (!inst) return;

    await admin
      .from("institution_members")
      .upsert(
        { institution_id: inst.id, user_id: userId, role: "student" },
        { onConflict: "institution_id,user_id" }
      );
  } catch (e) {
    console.error("[tryAutoAssociateInstitution]", e);
  }
}

// ─── Institution Queries ─────────────────────────────────────────────────────

/** Get institution the current user belongs to (as admin). Returns null if none. */
export async function getMyInstitution(): Promise<Institution | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("institution_members")
    .select("institution_id, role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) return null;

  const { data } = await admin
    .from("institutions")
    .select("*")
    .eq("id", membership.institution_id)
    .maybeSingle();

  return (data as Institution) ?? null;
}

export type InstitutionMemberRow = InstitutionMember & {
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  session_count: number;
  total_xp: number;
};

/** List all members of an institution with enriched data */
export async function getInstitutionMembers(
  institutionId: string
): Promise<InstitutionMemberRow[]> {
  await assertInstitutionAdmin(institutionId);
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("institution_members")
    .select("*")
    .eq("institution_id", institutionId)
    .order("added_at", { ascending: false });

  if (!members || members.length === 0) return [];

  const userIds = members.map((m: InstitutionMember) => m.user_id);

  const [settingsRes, sessionRes, xpRes] = await Promise.all([
    admin.from("user_settings").select("user_id, display_name, avatar_url").in("user_id", userIds),
    admin
      .from("sessions")
      .select("student_id")
      .in("student_id", userIds)
      .eq("status", "completed"),
    admin.from("user_xp").select("user_id, total_xp").in("user_id", userIds),
  ]);

  const settingsById = new Map(
    (settingsRes.data ?? []).map((s: { user_id: string; display_name: string | null; avatar_url: string | null }) => [
      s.user_id,
      s,
    ])
  );
  const sessionCountById: Record<string, number> = {};
  for (const s of sessionRes.data ?? []) {
    if (s.student_id) sessionCountById[s.student_id] = (sessionCountById[s.student_id] ?? 0) + 1;
  }
  const xpById = new Map(
    (xpRes.data ?? []).map((x: { user_id: string; total_xp: number }) => [x.user_id, x.total_xp])
  );

  // Fetch emails via admin auth API (batch)
  const emailById = new Map<string, string>();
  await Promise.all(
    userIds.map(async (uid: string) => {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        if (data?.user?.email) emailById.set(uid, data.user.email);
      } catch { /* skip */ }
    })
  );

  return (members as InstitutionMember[]).map((m) => ({
    ...m,
    display_name: settingsById.get(m.user_id)?.display_name ?? null,
    avatar_url: settingsById.get(m.user_id)?.avatar_url ?? null,
    email: emailById.get(m.user_id) ?? "—",
    session_count: sessionCountById[m.user_id] ?? 0,
    total_xp: xpById.get(m.user_id) ?? 0,
  }));
}

export type UsageReportRow = {
  student_email: string;
  student_name: string | null;
  session_count: number;
  subjects: string;
  tutors_used: number;
  avg_rating: number | null;
  total_spent_cents: number;
};

/** Usage report data for CSV download */
export async function getInstitutionUsageReport(
  institutionId: string
): Promise<UsageReportRow[]> {
  await assertInstitutionAdmin(institutionId);
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("institution_members")
    .select("user_id")
    .eq("institution_id", institutionId)
    .eq("role", "student");

  if (!members || members.length === 0) return [];
  const studentIds = (members as { user_id: string }[]).map((m) => m.user_id);

  const [sessionsRes, settingsRes, ratingsRes] = await Promise.all([
    admin
      .from("sessions")
      .select("student_id, tutor_id, course, price_paid_cents")
      .in("student_id", studentIds)
      .eq("status", "completed"),
    admin.from("user_settings").select("user_id, display_name").in("user_id", studentIds),
    admin
      .from("ratings")
      .select("student_id, rating")
      .in("student_id", studentIds),
  ]);

  const sessions = sessionsRes.data ?? [];
  const nameById = new Map(
    (settingsRes.data ?? []).map((s: { user_id: string; display_name: string | null }) => [s.user_id, s.display_name])
  );
  const emailById = new Map<string, string>();
  await Promise.all(
    studentIds.map(async (uid) => {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        if (data?.user?.email) emailById.set(uid, data.user.email);
      } catch { /* skip */ }
    })
  );

  const byStudent: Record<
    string,
    { sessions: typeof sessions; ratings: number[] }
  > = {};
  for (const s of sessions) {
    if (!byStudent[s.student_id]) byStudent[s.student_id] = { sessions: [], ratings: [] };
    byStudent[s.student_id]!.sessions.push(s);
  }
  for (const r of ratingsRes.data ?? []) {
    if (!byStudent[r.student_id]) byStudent[r.student_id] = { sessions: [], ratings: [] };
    byStudent[r.student_id]!.ratings.push(r.rating);
  }

  return studentIds.map((uid) => {
    const d = byStudent[uid] ?? { sessions: [], ratings: [] };
    const subjects = [...new Set(d.sessions.map((s) => s.course))].join(", ");
    const tutors = new Set(d.sessions.map((s) => s.tutor_id)).size;
    const avgRating =
      d.ratings.length > 0
        ? d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length
        : null;
    const totalSpent = d.sessions.reduce((s, r) => s + (r.price_paid_cents ?? 0), 0);

    return {
      student_email: emailById.get(uid) ?? uid,
      student_name: nameById.get(uid) ?? null,
      session_count: d.sessions.length,
      subjects,
      tutors_used: tutors,
      avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      total_spent_cents: totalSpent,
    };
  });
}

/** Month-to-date session count across all institution members */
export async function getInstitutionMonthlyUsage(
  institutionId: string
): Promise<{ sessionsThisMonth: number; creditsRemaining: number }> {
  await assertInstitutionAdmin(institutionId);
  const admin = createAdminClient();

  const { data: inst } = await admin
    .from("institutions")
    .select("session_credits")
    .eq("id", institutionId)
    .maybeSingle();

  const { data: members } = await admin
    .from("institution_members")
    .select("user_id")
    .eq("institution_id", institutionId);

  const studentIds = (members ?? []).map((m: { user_id: string }) => m.user_id);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await admin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .in("student_id", studentIds)
    .eq("status", "completed")
    .gte("created_at", monthStart.toISOString());

  return {
    sessionsThisMonth: count ?? 0,
    creditsRemaining: inst?.session_credits ?? 0,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

const updateInstitutionSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo_url: z.string().url().max(2048).nullable().optional(),
});

export async function updateInstitution(
  institutionId: string,
  input: z.infer<typeof updateInstitutionSchema>
): Promise<{ success: true } | { error: string }> {
  try {
    await assertInstitutionAdmin(institutionId);
    const parsed = updateInstitutionSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid input." };

    const admin = createAdminClient();
    const { error } = await admin
      .from("institutions")
      .update(parsed.data)
      .eq("id", institutionId);

    if (error) return { error: error.message };
    revalidatePath(`/institution/${institutionId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update." };
  }
}

/** Add a member by email (must be an existing Mentrixa user) */
export async function addInstitutionMemberByEmail(
  institutionId: string,
  email: string,
  role: "student" | "admin" = "student"
): Promise<{ success: true } | { error: string }> {
  try {
    await assertInstitutionAdmin(institutionId);
    const admin = createAdminClient();

    const norm = email.trim().toLowerCase();
    const { data: users } = await admin.auth.admin.listUsers();
    const target = users?.users.find((u) => u.email?.toLowerCase() === norm);

    if (!target) {
      return { error: "No Mentrixa account found with that email." };
    }

    // Plan limit check
    const { data: inst } = await admin
      .from("institutions")
      .select("plan")
      .eq("id", institutionId)
      .maybeSingle();

    const { count: memberCount } = await admin
      .from("institution_members")
      .select("user_id", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .eq("role", "student");

    const PLAN_LIMITS: Record<InstitutionPlan, number> = {
      free: 10,
      basic: 50,
      pro: Infinity,
    };
    const limit = PLAN_LIMITS[inst?.plan as InstitutionPlan ?? "free"] ?? 10;
    if ((memberCount ?? 0) >= limit) {
      return { error: `Your plan supports up to ${limit} students. Upgrade to add more.` };
    }

    const { error } = await admin
      .from("institution_members")
      .upsert(
        { institution_id: institutionId, user_id: target.id, role },
        { onConflict: "institution_id,user_id" }
      );

    if (error) return { error: error.message };
    revalidatePath(`/institution/${institutionId}/members`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add member." };
  }
}

/** Remove a member from the institution */
export async function removeInstitutionMember(
  institutionId: string,
  userId: string
): Promise<{ success: true } | { error: string }> {
  try {
    await assertInstitutionAdmin(institutionId);
    const admin = createAdminClient();

    const { error } = await admin
      .from("institution_members")
      .delete()
      .eq("institution_id", institutionId)
      .eq("user_id", userId);

    if (error) return { error: error.message };
    revalidatePath(`/institution/${institutionId}/members`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to remove member." };
  }
}

// ─── Tutor-facing: is a student an institution member? ───────────────────────

export type StudentInstitutionBadge = {
  institutionName: string;
  logoUrl: string | null;
} | null;

/**
 * Called from tutor views: returns institution info if the student
 * belongs to one, null otherwise. Lightweight — no auth check (tutor already validated).
 */
export async function getStudentInstitutionBadge(
  studentId: string
): Promise<StudentInstitutionBadge> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("institution_members")
      .select("institution_id, institutions(name, logo_url)")
      .eq("user_id", studentId)
      .maybeSingle();

    if (!data) return null;
    const inst = (data as unknown as { institutions: { name: string; logo_url: string | null } | null }).institutions;
    if (!inst) return null;

    return { institutionName: inst.name, logoUrl: inst.logo_url };
  } catch {
    return null;
  }
}

// ─── Super-admin: create institution ────────────────────────────────────────

const createInstitutionSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().min(4).max(100),
  adminEmail: z.string().email(),
  plan: z.enum(["free", "basic", "pro"]).default("free"),
  sessionCredits: z.number().int().min(0).default(0),
});

export async function createInstitution(
  input: z.infer<typeof createInstitutionSchema>
): Promise<{ success: true; institutionId: string } | { error: string }> {
  try {
    await requireRole(["admin"]);
    const parsed = createInstitutionSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid input." };

    const { name, domain, adminEmail, plan, sessionCredits } = parsed.data;
    const admin = createAdminClient();
    const normalDomain = normalizeDomain(domain);

    // Find the admin user
    const { data: users } = await admin.auth.admin.listUsers();
    const adminUser = users?.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
    if (!adminUser) return { error: "No Mentrixa account found for that admin email." };

    const { data: inst, error: instErr } = await admin
      .from("institutions")
      .insert({
        name,
        domain: normalDomain,
        admin_user_id: adminUser.id,
        plan,
        session_credits: sessionCredits,
      })
      .select("id")
      .single();

    if (instErr || !inst) return { error: instErr?.message ?? "Failed to create institution." };

    await admin.from("institution_members").insert({
      institution_id: inst.id,
      user_id: adminUser.id,
      role: "admin",
    });

    revalidatePath("/admin");
    return { success: true, institutionId: inst.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create institution." };
  }
}

// ─── Used by institution admin portal ────────────────────────────────────────

/** Fetch full institution data — accessible to institution admin or platform admin */
export async function getInstitutionById(
  institutionId: string
): Promise<Institution | null> {
  try {
    await assertInstitutionAdmin(institutionId);
    const admin = createAdminClient();
    const { data } = await admin
      .from("institutions")
      .select("*")
      .eq("id", institutionId)
      .maybeSingle();
    return (data as Institution) ?? null;
  } catch {
    return null;
  }
}

/** Check if the current user is an admin of ANY institution — returns institutionId or null */
export async function getMyInstitutionAdminId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data } = await admin
      .from("institution_members")
      .select("institution_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    return data?.institution_id ?? null;
  } catch {
    return null;
  }
}

"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { countRecentSecurityEvents } from "@/shared/core/security/security-events";

export interface PlatformMetrics {
  totalUsers: number;
  studentCount: number;
  tutorCount: number;
  sessionsToday: number;
  sessionsWeek: number;
  sessionsMonth: number;
  revenueMonth: number;
  activeQuests: number;
  pendingApprovals: number;
  activeDuels: number;
  activeDivisionWars: number;
  securityEvents24h: number;
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const securitySince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    usersRes,
    sessionsTodayRes,
    sessionsWeekRes,
    sessionsMonthRes,
    activeQuestsRes,
    pendingApprovalsRes,
    activeDuelsRes,
    activeDivisionWarsRes,
    securityEvents24h,
  ] = await Promise.all([
    adminClient.from("users").select("id, role", { count: "exact" }),
    adminClient.from("sessions").select("id", { count: "exact" }).gte("created_at", todayStart),
    adminClient.from("sessions").select("id", { count: "exact" }).gte("created_at", weekStart),
    adminClient.from("sessions").select("id, price_per_session", { count: "exact" }).gte("created_at", monthStart).neq("status", "cancelled"),
    adminClient.from("user_quest_progress").select("id", { count: "exact" }).eq("status", "in_progress"),
    adminClient.from("registration_requests").select("id", { count: "exact" }).eq("status", "pending"),
    adminClient.from("skill_duels").select("id", { count: "exact" }).eq("status", "active"),
    adminClient.from("division_wars").select("id", { count: "exact" }).eq("status", "active"),
    countRecentSecurityEvents(securitySince),
  ]);

  const users = usersRes.data ?? [];
  const studentCount = users.filter((u) => u.role === "student").length;
  const tutorCount = users.filter((u) => u.role === "tutor").length;

  const sessionsMonthData = sessionsMonthRes.data ?? [];
  const revenueMonth = sessionsMonthData.reduce((acc, s) => acc + (s.price_per_session ?? 0), 0);

  return {
    totalUsers: usersRes.count ?? 0,
    studentCount,
    tutorCount,
    sessionsToday: sessionsTodayRes.count ?? 0,
    sessionsWeek: sessionsWeekRes.count ?? 0,
    sessionsMonth: sessionsMonthRes.count ?? 0,
    revenueMonth,
    activeQuests: activeQuestsRes.count ?? 0,
    pendingApprovals: pendingApprovalsRes.count ?? 0,
    activeDuels: activeDuelsRes.count ?? 0,
    activeDivisionWars: activeDivisionWarsRes.count ?? 0,
    securityEvents24h,
  };
}

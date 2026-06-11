/**
 * Server-side analytics event tracker.
 * Uses service-role client so it bypasses RLS and never fails silently in prod.
 * All calls are fire-and-forget — never throw to callers.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";

export type AnalyticsEventName =
  // Sign-up funnel
  | "page_view_landing"
  | "signup_started"
  | "signup_completed"
  | "role_selected"
  // Activation
  | "first_session_booked"
  | "first_quest_completed"
  | "onboarding_quest_completed"
  | "first_duel_played"
  // Engagement
  | "quest_started"
  | "quest_completed"
  | "duel_challenged"
  | "division_joined"
  | "clan_created"
  // Revenue
  | "checkout_started"
  | "checkout_completed"
  | "checkout_abandoned"
  | "session_cancelled"
  | "refund_requested"
  // Retention
  | "daily_login"
  | "streak_maintained"
  | "streak_broken"
  | "level_up"
  | "rank_up"
  | "progress_snapshot_cta_clicked"
  | "rank_card_viewed"
  | "division_war_notification"
  | "breakthrough_detected"
  // Sessions
  | "session_booked"
  | "session_rated"
  // Misc
  | "referral_clicked"
  | "push_subscribed"
  | "realtime_disconnect"
  | "realtime_reconnect";

export type EventProperties = Record<string, string | number | boolean | null | undefined>;

export async function trackEvent(
  eventName: AnalyticsEventName,
  options: {
    userId?: string | null;
    sessionId?: string | null;
    properties?: EventProperties;
  } = {}
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("analytics_events").insert({
      user_id: options.userId ?? null,
      session_id: options.sessionId ?? null,
      event_name: eventName,
      properties: options.properties ?? {},
    });
  } catch {
    // Never let analytics failures propagate to callers
  }
}

/**
 * Analytics query helpers used by the admin analytics page.
 * All return typed, aggregated data — no raw rows exposed.
 */

export type EventCountRow = { event_name: string; count: number };
export type DailyCountRow = { day: string; count: number };
export type FunnelStepRow = { step: string; users: number; pct: number };
export type SubjectRow = { subject: string; count: number };
export type RevenueRow = { day: string; revenue: number; sessions: number };

/** Count events by name for the last N days */
export async function getEventCounts(days: 7 | 30 = 7): Promise<EventCountRow[]> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
    const { data } = await admin
      .from("analytics_events")
      .select("event_name")
      .gte("created_at", since);

    if (!data) return [];

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.event_name] = (counts[row.event_name] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([event_name, count]) => ({ event_name, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

/** Daily event counts for a specific event over the last N days */
export async function getDailyEventCounts(
  eventName: string,
  days: 7 | 30 = 30
): Promise<DailyCountRow[]> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
    const { data } = await admin
      .from("analytics_events")
      .select("created_at")
      .eq("event_name", eventName)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (!data) return [];

    const counts: Record<string, number> = {};
    for (const row of data) {
      const day = row.created_at.slice(0, 10);
      counts[day] = (counts[day] ?? 0) + 1;
    }

    // Fill gaps with 0s
    const result: DailyCountRow[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400 * 1000);
      const day = d.toISOString().slice(0, 10);
      result.push({ day, count: counts[day] ?? 0 });
    }
    return result;
  } catch {
    return [];
  }
}

/** Sign-up → First session → Second session funnel */
export async function getActivationFunnel(): Promise<FunnelStepRow[]> {
  try {
    const admin = createAdminClient();

    const [signupsRes, firstSessionRes, secondSessionRes] = await Promise.all([
      admin
        .from("analytics_events")
        .select("user_id", { count: "exact", head: false })
        .eq("event_name", "signup_completed")
        .not("user_id", "is", null),
      admin
        .from("analytics_events")
        .select("user_id", { count: "exact", head: false })
        .eq("event_name", "first_session_booked")
        .not("user_id", "is", null),
      admin
        .from("sessions")
        .select("student_id", { count: "exact", head: false })
        .eq("status", "completed"),
    ]);

    // Distinct user counts
    const signupUsers = new Set((signupsRes.data ?? []).map((r) => r.user_id)).size;
    const firstSessionUsers = new Set((firstSessionRes.data ?? []).map((r) => r.user_id)).size;

    // For second session: students with 2+ completed sessions
    const sessionByStudent: Record<string, number> = {};
    for (const r of secondSessionRes.data ?? []) {
      if (r.student_id) sessionByStudent[r.student_id] = (sessionByStudent[r.student_id] ?? 0) + 1;
    }
    const secondSessionUsers = Object.values(sessionByStudent).filter((c) => c >= 2).length;

    const top = Math.max(signupUsers, 1);

    return [
      { step: "Signed up", users: signupUsers, pct: 100 },
      { step: "First session", users: firstSessionUsers, pct: Math.round((firstSessionUsers / top) * 100) },
      { step: "Second session", users: secondSessionUsers, pct: Math.round((secondSessionUsers / top) * 100) },
    ];
  } catch {
    return [];
  }
}

/** Most popular subjects from quests and sessions */
export async function getPopularSubjects(limit = 8): Promise<SubjectRow[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("analytics_events")
      .select("properties")
      .in("event_name", ["quest_started", "session_booked"])
      .not("properties->subject", "is", null)
      .limit(2000);

    if (!data) return [];

    const counts: Record<string, number> = {};
    for (const row of data) {
      const subject = (row.properties as Record<string, unknown>)?.subject;
      if (typeof subject === "string" && subject.trim()) {
        counts[subject] = (counts[subject] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/** Daily revenue from completed sessions for the last N days */
export async function getDailyRevenue(days: 7 | 30 = 30): Promise<RevenueRow[]> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
    const { data } = await admin
      .from("sessions")
      .select("created_at, price_paid_cents")
      .eq("status", "completed")
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (!data) return [];

    const byDay: Record<string, { revenue: number; sessions: number }> = {};
    for (const row of data) {
      const day = row.created_at.slice(0, 10);
      if (!byDay[day]) byDay[day] = { revenue: 0, sessions: 0 };
      byDay[day]!.revenue += (row.price_paid_cents ?? 0) / 100;
      byDay[day]!.sessions += 1;
    }

    const result: RevenueRow[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400 * 1000);
      const day = d.toISOString().slice(0, 10);
      result.push({
        day,
        revenue: Math.round((byDay[day]?.revenue ?? 0) * 100) / 100,
        sessions: byDay[day]?.sessions ?? 0,
      });
    }
    return result;
  } catch {
    return [];
  }
}

/** Total counts for key KPI metrics */
export async function getKpiMetrics(): Promise<{
  totalUsers: number;
  totalSessions: number;
  totalRevenue: number;
  activeToday: number;
}> {
  try {
    const admin = createAdminClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [usersRes, sessionsRes, activeTodayRes] = await Promise.all([
      admin.from("users").select("id", { count: "exact", head: true }),
      admin.from("sessions").select("price_paid_cents").eq("status", "completed"),
      admin
        .from("analytics_events")
        .select("user_id", { count: "exact", head: false })
        .eq("event_name", "daily_login")
        .gte("created_at", todayStart.toISOString())
        .not("user_id", "is", null),
    ]);

    const totalRevenue = (sessionsRes.data ?? []).reduce(
      (sum, r) => sum + (r.price_paid_cents ?? 0) / 100,
      0
    );
    const activeToday = new Set((activeTodayRes.data ?? []).map((r) => r.user_id)).size;

    return {
      totalUsers: usersRes.count ?? 0,
      totalSessions: sessionsRes.data?.length ?? 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeToday,
    };
  } catch {
    return { totalUsers: 0, totalSessions: 0, totalRevenue: 0, activeToday: 0 };
  }
}

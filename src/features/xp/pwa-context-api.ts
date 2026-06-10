import { NextResponse } from "next/server";
import { createClient } from "@/shared/integrations/supabase/server";

/** Completed session count + XP for PWA offline cache and push opt-in timing. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ count }, xpRow] = await Promise.all([
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "completed"),
    supabase.from("user_xp").select("total_xp, streak_days").eq("user_id", user.id).maybeSingle(),
  ]);

  return NextResponse.json({
    completedSessions: count ?? 0,
    totalXp: xpRow.data?.total_xp ?? 0,
    streakDays: xpRow.data?.streak_days ?? 0,
  });
}

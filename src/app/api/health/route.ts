import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Liveness for uptime monitors (Better Stack, Pingdom, etc.). No auth.
 */
export async function GET() {
  let dbOk = false;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("users").select("id", { head: true, count: "exact" }).limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    {
      ok: dbOk,
      database: dbOk ? "ok" : "degraded",
      service: "mentrixa",
      time: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 }
  );
}

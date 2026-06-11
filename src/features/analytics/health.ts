import { NextResponse } from "next/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

/** Liveness for uptime monitors. Always 200 — measures server availability only. */
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
      ok: true,
      db: dbOk,
      dbOk,
      database: dbOk ? "ok" : "degraded",
      service: "mentrixa",
      time: new Date().toISOString(),
    },
    { status: 200 },
  );
}

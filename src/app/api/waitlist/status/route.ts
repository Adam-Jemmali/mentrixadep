import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function normEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = normEmail(url.searchParams.get("email"));
    if (!email) {
      return NextResponse.json({ approved: false, status: "missing" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data } = await admin
      .from("registration_requests")
      .select("status")
      .eq("email", email)
      .maybeSingle();

    const status = data?.status ?? "none";
    return NextResponse.json({
      approved: status === "approved",
      status,
    });
  } catch (e) {
    console.error("[waitlist/status] failed:", e);
    return NextResponse.json({ approved: false, status: "error" }, { status: 500 });
  }
}

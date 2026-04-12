import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchRegistrationRequestRow } from "@/lib/registration-request-lookup";

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
    const row = await fetchRegistrationRequestRow(admin, email);

    const status = row?.status ?? "none";
    return NextResponse.json({
      approved: status === "approved",
      status,
    });
  } catch (e) {
    console.error("[waitlist/status] failed:", e);
    return NextResponse.json({ approved: false, status: "error" }, { status: 500 });
  }
}

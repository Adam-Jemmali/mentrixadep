import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistReceivedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function normEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; role?: "student" | "tutor" };
    const email = normEmail(body.email);
    const role = body.role === "tutor" ? "tutor" : "student";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("registration_requests")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (existing?.status === "approved") {
      return NextResponse.json({ ok: true, approved: true });
    }

    if (existing?.status === "rejected") {
      return NextResponse.json(
        { error: "Your application has been rejected. Please contact support@mentrixa.one if you believe this is a mistake." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    if (existing?.id) {
      await admin
        .from("registration_requests")
        .update({ role, status: "pending", updated_at: now })
        .eq("id", existing.id);
    } else {
      await admin.from("registration_requests").insert({
        email,
        role,
        status: "pending",
        created_at: now,
        updated_at: now,
      });
    }

    void sendWaitlistReceivedEmail(email, role);
    return NextResponse.json({ ok: true, approved: false });
  } catch (e) {
    console.error("[waitlist/join] failed:", e);
    return NextResponse.json({ error: "Failed to join waitlist." }, { status: 500 });
  }
}

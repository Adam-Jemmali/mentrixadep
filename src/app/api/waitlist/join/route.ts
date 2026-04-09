import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistReceivedEmail } from "@/lib/email";
import { isDisposableEmail } from "@/lib/disposable-email";

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
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Temporary email addresses are not allowed. Please use a real email you can access." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("registration_requests")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      console.error("[waitlist/join] fetch error:", fetchError.message, fetchError.details);
      return NextResponse.json({ error: "Could not check waitlist status. Please try again." }, { status: 500 });
    }

    if (existing?.status === "approved") {
      return NextResponse.json({ ok: true, approved: true });
    }

    if (existing?.status === "rejected") {
      return NextResponse.json(
        { error: "Your application has been rejected. Please contact support@mentrixa.one if you believe this is a mistake." },
        { status: 403 }
      );
    }

    if (existing?.id) {
      const { error: updateError } = await admin
        .from("registration_requests")
        .update({ role, status: "pending" })
        .eq("id", existing.id);
      if (updateError) {
        console.error("[waitlist/join] update error:", updateError.message, updateError.details);
        return NextResponse.json({ error: "Could not update waitlist entry. Please try again." }, { status: 500 });
      }
    } else {
      const { error: insertError } = await admin.from("registration_requests").insert({
        email,
        role,
        status: "pending",
      });
      if (insertError) {
        console.error("[waitlist/join] insert error:", insertError.message, insertError.details, insertError.code);
        return NextResponse.json({ error: "Could not add to waitlist. Please try again." }, { status: 500 });
      }
    }

    void sendWaitlistReceivedEmail(email, role);
    return NextResponse.json({ ok: true, approved: false });
  } catch (e) {
    console.error("[waitlist/join] unexpected error:", e);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

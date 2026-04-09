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
    const body = (await req.json().catch(() => ({}))) as { email?: string; role?: "student" | "tutor" };
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
      return NextResponse.json({
        ok: true,
        approved: true,
        status: "approved",
        message: "You already applied and your waitlist access has been approved.",
      });
    }

    if (existing?.status === "rejected") {
      return NextResponse.json(
        {
          error: "Your waitlist application was rejected. Please contact support@mentrixa.one if you believe this is a mistake.",
          status: "rejected",
        },
        { status: 403 }
      );
    }

    if (existing?.status === "pending") {
      return NextResponse.json(
        {
          error: "You have already applied to the waitlist. Please wait for an admin decision.",
          status: "pending",
        },
        { status: 409 }
      );
    }

    const { error: insertError } = await admin.from("registration_requests").insert({
      email,
      role,
      status: "pending",
    });
    if (insertError) {
      // Handle race condition: duplicate email inserted by another request.
      if (insertError.code === "23505") {
        const { data: raced } = await admin
          .from("registration_requests")
          .select("status")
          .eq("email", email)
          .maybeSingle();
        if (raced?.status === "approved") {
          return NextResponse.json({
            ok: true,
            approved: true,
            status: "approved",
            message: "You already applied and your waitlist access has been approved.",
          });
        }
        if (raced?.status === "rejected") {
          return NextResponse.json(
            {
              error: "Your waitlist application was rejected. Please contact support@mentrixa.one if you believe this is a mistake.",
              status: "rejected",
            },
            { status: 403 }
          );
        }
        return NextResponse.json(
          {
            error: "You have already applied to the waitlist. Please wait for an admin decision.",
            status: "pending",
          },
          { status: 409 }
        );
      }
      console.error("[waitlist/join] insert error:", insertError.message, insertError.details, insertError.code);
      return NextResponse.json({ error: "Could not add to waitlist. Please try again." }, { status: 500 });
    }

    void sendWaitlistReceivedEmail(email, role);
    return NextResponse.json({
      ok: true,
      approved: false,
      status: "pending",
      message: "You are on the waitlist. Check your email for confirmation.",
    });
  } catch (e) {
    console.error("[waitlist/join] unexpected error:", e);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

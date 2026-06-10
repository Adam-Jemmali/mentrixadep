import { NextResponse } from "next/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { submitRegistrationRequest } from "@/features/registration/registration-request-join";
import { fetchRegistrationRequestRow } from "@/features/registration/registration-request-lookup";

function normEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string; role?: "student" | "tutor" };
    const email = normEmail(body.email);
    const role = body.role === "tutor" ? "tutor" : "student";

    const result = await submitRegistrationRequest(email, role);

    if (result.outcome === "approved") {
      return NextResponse.json({
        ok: true,
        approved: true,
        status: "approved",
        message: result.message,
      });
    }

    if (result.outcome === "rejected") {
      return NextResponse.json(
        { error: result.error, status: "rejected" },
        { status: 403 },
      );
    }

    if (result.outcome === "pending") {
      const isDuplicate = result.alreadyPending === true;
      return NextResponse.json(
        {
          ok: !isDuplicate,
          approved: false,
          status: "pending",
          confirmationEmailSent: result.confirmationEmailSent,
          message: result.message,
          error: isDuplicate ? result.message : undefined,
        },
        { status: isDuplicate ? 409 : 200 },
      );
    }

    return NextResponse.json(
      { error: result.error ?? "Could not start onboarding request. Please try again." },
      { status: 400 },
    );
  } catch (e) {
    console.error("[waitlist/join] unexpected error:", e);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
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

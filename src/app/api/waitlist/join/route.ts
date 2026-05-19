import { NextResponse } from "next/server";
import { submitRegistrationRequest } from "@/lib/registration-request-join";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string; role?: "student" | "tutor" };
    const email = String(body.email ?? "").trim().toLowerCase();
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

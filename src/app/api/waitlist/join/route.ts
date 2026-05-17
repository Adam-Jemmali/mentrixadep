import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistReceivedEmail } from "@/lib/email";
import { isDisposableEmail } from "@/lib/disposable-email";

export const dynamic = "force-dynamic";

function normEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function roleLabel(role: "student" | "tutor"): string {
  return role === "tutor" ? "Guide" : "Mentrixer";
}

/** Sends "Onboarding request received" whenever we surface a pending waitlist state. */
async function sendPendingConfirmationEmail(
  email: string,
  role: "student" | "tutor",
): Promise<boolean> {
  const emailed = await sendWaitlistReceivedEmail(email, role);
  if (!emailed) {
    console.error("[waitlist/join] confirmation email failed after fallback", { email, role });
  }
  return emailed;
}

function pendingJoinResponse(
  email: string,
  role: "student" | "tutor",
  opts: {
    httpStatus: number;
    error?: string;
    ok?: boolean;
    emailed: boolean;
  },
) {
  const label = roleLabel(role);
  const confirmationLine = opts.emailed
    ? `We sent "Onboarding request received" to ${email}. Check spam if you do not see it.`
    : `Your request is saved; confirmation email is delayed — check back shortly or contact support@mentrixa.one.`;

  return NextResponse.json(
    {
      ok: opts.ok ?? false,
      approved: false,
      status: "pending" as const,
      confirmationEmailSent: opts.emailed,
      error: opts.error,
      message: opts.error
        ? `${opts.error} ${confirmationLine}`
        : `You're in onboarding as a ${label}. ${confirmationLine} We will email again when an admin approves your access.`,
    },
    { status: opts.httpStatus },
  );
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
      .select("id, status, role")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      console.error("[waitlist/join] fetch error:", fetchError.message, fetchError.details);
      return NextResponse.json({ error: "Could not check onboarding status. Please try again." }, { status: 500 });
    }

    if (existing?.status === "approved") {
      if (existing.role && existing.role !== role) {
        return NextResponse.json(
          {
            error:
              `This email is already approved as a ${existing.role === "tutor" ? "Guide" : "Mentrixer"}. Please continue with that role or contact support@mentrixa.one if this is incorrect.`,
            status: "approved",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({
        ok: true,
        approved: true,
        status: "approved",
        message: "You are already approved. Continue with account setup using this email.",
      });
    }

    if (existing?.status === "rejected") {
      if (existing.role && existing.role !== role) {
        return NextResponse.json(
          {
            error:
              `This email was not approved as a ${existing.role === "tutor" ? "Guide" : "Mentrixer"}. You cannot submit another access request with this email. Contact support@mentrixa.one if this seems incorrect.`,
            status: "rejected",
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          error: "This access request was not approved, and this email cannot submit another one. Contact support@mentrixa.one if this seems incorrect.",
          status: "rejected",
        },
        { status: 403 }
      );
    }

    if (existing?.status === "pending") {
      const pendingRole = existing.role === "tutor" ? "tutor" : "student";
      const emailed = await sendPendingConfirmationEmail(email, pendingRole);
      if (existing.role && existing.role !== role) {
        return pendingJoinResponse(email, pendingRole, {
          httpStatus: 409,
          emailed,
          error: `This email already has a pending ${roleLabel(pendingRole)} onboarding request. You cannot switch roles until review is complete.`,
        });
      }
      return pendingJoinResponse(email, pendingRole, {
        httpStatus: 409,
        emailed,
        error: "You already have a pending onboarding request. Please wait for admin review.",
      });
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
          .select("status, role")
          .eq("email", email)
          .maybeSingle();
        if (raced?.status === "approved") {
          if (raced.role && raced.role !== role) {
            return NextResponse.json(
              {
                error:
                  `This email is already approved as a ${raced.role === "tutor" ? "Guide" : "Mentrixer"}. Please continue with that role or contact support@mentrixa.one if this is incorrect.`,
                status: "approved",
              },
              { status: 409 }
            );
          }
          return NextResponse.json({
            ok: true,
            approved: true,
            status: "approved",
            message: "You are already approved. Continue with account setup using this email.",
          });
        }
        if (raced?.status === "rejected") {
          if (raced.role && raced.role !== role) {
            return NextResponse.json(
              {
                error:
                  `This email was not approved as a ${raced.role === "tutor" ? "Guide" : "Mentrixer"}. You cannot submit another access request with this email. Contact support@mentrixa.one if this seems incorrect.`,
                status: "rejected",
              },
              { status: 403 }
            );
          }
          return NextResponse.json(
            {
              error: "This access request was not approved, and this email cannot submit another one. Contact support@mentrixa.one if this seems incorrect.",
              status: "rejected",
            },
            { status: 403 }
          );
        }
        if (raced?.status === "pending") {
          const pendingRole = raced.role === "tutor" ? "tutor" : "student";
          const emailed = await sendPendingConfirmationEmail(email, pendingRole);
          if (raced.role && raced.role !== role) {
            return pendingJoinResponse(email, pendingRole, {
              httpStatus: 409,
              emailed,
              error: `This email already has a pending ${roleLabel(pendingRole)} onboarding request. You cannot switch roles until review is complete.`,
            });
          }
          return pendingJoinResponse(email, pendingRole, {
            httpStatus: 409,
            emailed,
            error: "You already have a pending onboarding request. Please wait for admin review.",
          });
        }
      }
      console.error("[waitlist/join] insert error:", insertError.message, insertError.details, insertError.code);
      return NextResponse.json({ error: "Could not start onboarding request. Please try again." }, { status: 500 });
    }

    const emailed = await sendPendingConfirmationEmail(email, role);

    return NextResponse.json({
      ok: true,
      approved: false,
      status: "pending",
      confirmationEmailSent: emailed,
      message: emailed
        ? `You're in onboarding as a ${roleLabel(role)}. Check your email for "Onboarding request received" (and spam). We will email again when an admin approves your access.`
        : `Your ${roleLabel(role)} onboarding request is saved. Confirmation email is delayed; please check back shortly.`,
    });
  } catch (e) {
    console.error("[waitlist/join] unexpected error:", e);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

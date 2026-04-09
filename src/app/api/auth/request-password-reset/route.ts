import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeError, validateEmail } from "@/lib/security";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function jsonOk() {
  // Generic response avoids account enumeration.
  return NextResponse.json({ ok: true, emailQueued: false as boolean });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = validateEmail(body.email);
    const admin = createAdminClient();

    const rid = String(Date.now());
    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/confirm-reset?rid=${encodeURIComponent(rid)}`;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ ok: true, emailQueued: false });
    }

    // Best effort: attach latest-link marker for stale-link rejection.
    const userId = linkData.user?.id;
    if (userId) {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { password_reset_rid: rid },
      });
    }

    await sendPasswordResetEmail(email, { resetLink: linkData.properties.action_link });
    return NextResponse.json({ ok: true, emailQueued: true });
  } catch (error) {
    console.error("[auth/request-password-reset] failed:", sanitizeError(error));
    return NextResponse.json({ ok: true, emailQueued: false });
  }
}


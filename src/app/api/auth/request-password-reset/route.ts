import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeError, validateEmail } from "@/lib/security";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function jsonOk() {
  // Generic response avoids account enumeration.
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = validateEmail(body.email);
    const admin = createAdminClient();

    const { data: userRow } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    // Always return OK to caller, regardless of user existence.
    if (!userRow?.id) return jsonOk();

    const rid = String(Date.now());
    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/confirm-reset?rid=${encodeURIComponent(rid)}`;

    // Store latest reset request marker in auth user metadata.
    await admin.auth.admin.updateUserById(userRow.id, {
      user_metadata: { password_reset_rid: rid },
    });

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (linkError || !linkData?.properties?.action_link) {
      return jsonOk();
    }

    await sendPasswordResetEmail(email, { resetLink: linkData.properties.action_link });
    return jsonOk();
  } catch (error) {
    console.error("[auth/request-password-reset] failed:", sanitizeError(error));
    return jsonOk();
  }
}


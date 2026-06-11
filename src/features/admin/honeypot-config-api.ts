import { NextResponse } from "next/server";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getClientIpFromRequest } from "@/shared/core/security";
import { recordSecurityEvent } from "@/shared/core/security/security-events";

const HONEYPOT_PATH = "/api/admin/config";

async function honeypotBlacklistUser(userId: string, _ip: string): Promise<void> {
  const admin = createAdminClient();
  const reason = `Honeypot trap triggered at ${HONEYPOT_PATH}`;

  await admin
    .from("users")
    .update({
      approved: false,
      is_blacklisted: true,
      verification_status: "blacklisted",
      status: "suspended",
    })
    .eq("id", userId);

  await admin.from("blacklisted_users").upsert({
    user_id: userId,
    blacklisted_by: null,
    reason,
  });
}

async function handleHoneypot(req: Request): Promise<NextResponse> {
  const ip = getClientIpFromRequest({ headers: req.headers });
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let dbUser: { id: string; role: string } | null = null;
  if (authUser) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("users")
      .select("id, role")
      .eq("id", authUser.id)
      .maybeSingle();
    dbUser = data;
  }

  void recordSecurityEvent({
    event_type: "honeypot_admin_config",
    user_id: dbUser?.id ?? null,
    ip_address: ip,
    metadata: {
      path: HONEYPOT_PATH,
      role: dbUser?.role ?? "anonymous",
      method: req.method,
    },
  });

  if (!dbUser || dbUser.role === "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await honeypotBlacklistUser(dbUser.id, ip);
    void recordSecurityEvent({
      event_type: "honeypot_blacklist",
      user_id: dbUser.id,
      ip_address: ip,
      metadata: { path: HONEYPOT_PATH },
    });
  } catch (err) {
    console.error("[honeypot] blacklist failed:", err);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(req: Request) {
  return handleHoneypot(req);
}

export { handleHoneypot as POST, handleHoneypot as PUT, handleHoneypot as DELETE };

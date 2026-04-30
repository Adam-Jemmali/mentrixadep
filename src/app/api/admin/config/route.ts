import { NextResponse, type NextRequest } from "next/server";
import { getClientIpFromRequest, logSecurityEvent } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * HONEYPOT ROUTE: /api/admin/config
 * This route exists solely to catch malicious bots and hackers.
 * Anyone hitting this route is immediately flagged as a threat.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIpFromRequest(request);
  
  // 1. Log the attempt with high severity
  logSecurityEvent("honeypot_triggered", {
    ip,
    userAgent: request.headers.get("user-agent"),
    path: request.nextUrl.pathname,
    action: "IMMEDIATE_BLACKLIST_RECOMMENDED"
  });

  // 2. Attempt to blacklist the IP if a blacklist system exists
  // For now, we use the Supabase admin client to flag any user who might be logged in
  const supabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("users")
      .update({ is_blacklisted: true, status: "suspended" })
      .eq("id", user.id);
      
    logSecurityEvent("user_blacklisted_via_honeypot", {
      userId: user.id,
      ip
    });
  }

  // 3. Return a confusing error to make the hacker waste time
  // Returning 404 might be too obvious, 403 is better, 418 (Teapot) is elite.
  return new NextResponse(
    JSON.stringify({ 
      error: "Authorization Required", 
      system_id: "MENTRIXA-ALARM-B29",
      trace_id: Math.random().toString(36).substring(7) 
    }), 
    { 
      status: 403,
      headers: { "Content-Type": "application/json" }
    }
  );
}

// POST, PUT, DELETE should also trigger the trap
export { GET as POST, GET as PUT, GET as DELETE };

import { NextRequest } from "next/server";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookSessionAsUser } from "@/app/actions/student";
import { approveSessionRequest } from "@/app/actions/tutor";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Test Automation Cron:
 * 1. Creates an availability slot for a 'Test Tutor'.
 * 2. Books it for a 'Trap Time' student (bypassing Stripe).
 * 3. Approves the request instantly.
 * 
 * Result: A scheduled session ready for video call testing.
 * 
 * Authorization: Bearer <CRON_SECRET>
 * Required Env:
 * - AUTOMATION_TEST_TUTOR_ID: UUID of the tutor user
 * - AUTOMATION_TRAP_TIME_ID: UUID of the student user
 */
export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) return auth.response;

  return runCronJob("test-session-automation", async () => {
    const admin = createAdminClient();
    
    const tutorId = req.nextUrl.searchParams.get("tutorId") || process.env.AUTOMATION_TEST_TUTOR_ID;
    const studentId = req.nextUrl.searchParams.get("studentId") || process.env.AUTOMATION_TRAP_TIME_ID;
    const course = req.nextUrl.searchParams.get("course") || "General Practice";
    const hourOffset = parseInt(req.nextUrl.searchParams.get("hourOffset") || "0", 10);

    if (!tutorId || !studentId) {
      throw new Error("Missing tutorId or studentId. Set AUTOMATION_TEST_TUTOR_ID and AUTOMATION_TRAP_TIME_ID in env.");
    }

    // 1. Create availability for tutor
    // We aim for the start of the next hour + hourOffset
    const startTime = new Date();
    startTime.setUTCHours(startTime.getUTCHours() + 1 + hourOffset, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setUTCHours(endTime.getUTCHours() + 1);

    const { data: avail, error: availErr } = await admin
      .from("availability")
      .insert({
        tutor_id: tutorId,
        course: course,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        price_per_session: 1000, 
        active: true,
        booking_status: "available",
        series_id: randomUUID()
      })
      .select()
      .single();

    if (availErr) {
      // If it fails with "tutor_already_has_session" or overlap, we might want to know
      throw new Error(`Availability creation failed: ${availErr.message}`);
    }

    // 2. Book as student (Bypass Stripe)
    // We pass a dummy stripeCheckoutSessionId to satisfy the schema/checks
    let bookResult;
    try {
      bookResult = await bookSessionAsUser(avail.id, studentId, {
        skipStripeVerification: true,
        stripeCheckoutSessionId: `auto_${randomUUID().slice(0, 8)}`
      });
    } catch (err) {
      throw new Error(`Booking failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const requestId = (bookResult as { request?: { id: string } }).request?.id;
    if (!requestId) {
      throw new Error("No request ID returned from booking action");
    }

    // 3. Approve instantly (Internal Admin Context)
    try {
      await approveSessionRequest(requestId, tutorId);
    } catch (_e) {
       console.warn("[automation] approveSessionRequest action failed (likely auth), falling back to direct RPC");
       // Fallback to direct RPC using admin client
       const { error: rpcErr } = await admin.rpc("approve_session_request_atomic", {
         p_request_id: requestId,
         p_actor_id: tutorId,
         p_is_admin: true
       });
       if (rpcErr) throw new Error(`Direct RPC approval failed: ${rpcErr.message}`);
    }

    return {
      success: true,
      sessionId: avail.id,
      requestId: requestId,
      scheduledTime: startTime.toISOString(),
      tutorId,
      studentId,
      course
    };
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendContactFeedbackInbound } from "@/lib/email";

const feedbackSchema = z.object({
  message: z.string().trim().min(5).max(2000),
  pagePath: z.string().trim().max(512).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = feedbackSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter at least a short feedback message." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You need to be signed in to send feedback." }, { status: 401 });
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: "student" | "tutor" | "admin" }>();

    const userAgent = request.headers.get("user-agent") ?? null;
    const { error } = await supabase.from("feedback_submissions").insert({
      user_id: user.id,
      user_role: userRow?.role ?? null,
      message: parsed.data.message,
      page_path: parsed.data.pagePath ?? null,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[api/feedback] insert failed", error);
      return NextResponse.json({ error: "Could not send feedback right now. Please try again." }, { status: 500 });
    }

    // Best-effort inbox notification: do not fail the API if email delivery fails.
    // Primary source of truth remains `feedback_submissions` in Supabase.
    try {
      const senderEmail = user.email?.trim() || "no-reply@mentrixa.one";
      const senderLabel = user.email?.split("@")[0] || user.id.slice(0, 8);
      const roleLabel = userRow?.role ?? "unknown";
      const pageLabel = parsed.data.pagePath ?? "(unknown page)";

      await sendContactFeedbackInbound({
        fromEmail: senderEmail,
        fromName: senderLabel,
        category: `In-app feedback (${roleLabel})`,
        message: `${parsed.data.message}\n\n---\nUser ID: ${user.id}\nRole: ${roleLabel}\nPage: ${pageLabel}`,
      });
    } catch (mailError) {
      console.error("[api/feedback] email notify failed", mailError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/feedback] unexpected error", error);
    return NextResponse.json({ error: "Could not send feedback right now. Please try again." }, { status: 500 });
  }
}

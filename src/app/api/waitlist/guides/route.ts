import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const waitlistSchema = z.object({
  email: z.string().trim().email(),
  courseName: z.string().trim().max(120).optional(),
  pagePath: z.string().trim().max(512).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = waitlistSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You need to be signed in." }, { status: 401 });
    }

    const { error } = await supabase.from("guide_waitlist_requests").insert({
      user_id: user.id,
      email: parsed.data.email,
      course_name: parsed.data.courseName ?? null,
      page_path: parsed.data.pagePath ?? null,
      notes: parsed.data.notes ?? null,
    });

    if (error) {
      console.error("[api/waitlist/guides] insert failed", error);
      return NextResponse.json({ error: "Could not save your request right now." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/waitlist/guides] unexpected error", error);
    return NextResponse.json({ error: "Could not save your request right now." }, { status: 500 });
  }
}

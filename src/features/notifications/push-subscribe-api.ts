import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/shared/integrations/supabase/server";

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = subSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint, keys } = parsed.data;
    const ua = request.headers.get("user-agent") ?? "";

    await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);

    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth_secret: keys.auth,
      user_agent: ua.slice(0, 512),
    });

    if (error) {
      console.error("[push/subscribe]", error);
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push/subscribe]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

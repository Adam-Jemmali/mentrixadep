import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { applyXpAward } from "@/app/actions/xp";

const bodySchema = z.object({
  amount: z.number().int(),
  awardKey: z.string().min(1).max(256),
  divisionKey: z.string().nullable().optional(),
});

/**
 * Replays idempotent XP awards from the PWA offline queue (same keys as applyXpAward).
 */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, awardKey, divisionKey } = parsed.data;
    const result = await applyXpAward(user.id, amount, awardKey, divisionKey ?? null);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/pwa/xp-sync]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

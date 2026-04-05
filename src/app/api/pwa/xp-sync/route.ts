import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Disabled security-sensitive endpoint.
 *
 * Client-controlled XP payloads can be abused to mint arbitrary XP by sending
 * unique award keys. XP grants must be performed from trusted server actions
 * where award keys and amounts are derived server-side.
 */
export async function POST(_request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error:
          "XP sync is temporarily disabled for security hardening. XP is still granted via trusted server actions.",
      },
      { status: 403 },
    );
  } catch (e) {
    console.error("[api/pwa/xp-sync]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

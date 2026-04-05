import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStreakUiState } from "@/app/actions/xp";

export const dynamic = "force-dynamic";

/** Streak banner state for LevelUpExperience — server-only; no client import of xp actions. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const s = await getStreakUiState(user.id);
  return NextResponse.json(s);
}

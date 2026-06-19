import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/shared/core/auth";
import { getMatchmakerGuides } from "@/features/matchmaker/matchmaker";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  userId: z.string().uuid(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    userId: searchParams.get("userId"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid userId." }, { status: 400 });
  }

  if (parsed.data.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await getMatchmakerGuides(parsed.data.userId);
  return NextResponse.json(result);
}

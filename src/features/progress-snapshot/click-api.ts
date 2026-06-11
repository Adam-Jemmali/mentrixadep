import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { trackEvent } from "@/shared/integrations/analytics";

const bodySchema = z.object({
  snapshotId: z.string().uuid(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireRole(["student", "admin"]);
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: row } = await admin
      .from("progress_snapshots")
      .select("id, student_id, snapshot_data, clicked_at")
      .eq("id", parsed.data.snapshotId)
      .maybeSingle();

    if (!row || row.student_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!row.clicked_at) {
      await admin
        .from("progress_snapshots")
        .update({ clicked_at: new Date().toISOString() })
        .eq("id", parsed.data.snapshotId);
    }

    const snapshot = row.snapshot_data as { recommendedGuide?: { tutorId?: string } };
    void trackEvent("progress_snapshot_cta_clicked", {
      userId: user.id,
      properties: {
        snapshotId: parsed.data.snapshotId,
        tutorId: snapshot?.recommendedGuide?.tutorId ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

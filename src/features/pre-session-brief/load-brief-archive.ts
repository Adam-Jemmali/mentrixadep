"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";

export type BriefArchiveRow = {
  id: string;
  sessionId: string;
  sessionStartTime: string;
  course: string;
  guideName: string;
  targetNodes: string[];
  likelyCoverage: string[];
  createdAt: string;
};

export async function loadBriefArchive(limit = 52): Promise<BriefArchiveRow[]> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!hasEntitlement(entitlements, "momentum.brief_archive")) {
    return [];
  }

  const supabase = await createClient();
  const { data: briefRows, error } = await supabase
    .from("session_briefs")
    .select(
      "id, session_id, created_at, likely_coverage, sessions!inner(id, start_time, course, tutor_id, status)",
    )
    .eq("student_id", user.id)
    .neq("sessions.status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !briefRows) return [];

  const tutorIds = [
    ...new Set(
      briefRows.map((row) => {
        const session = row.sessions as { tutor_id?: string } | { tutor_id?: string }[] | null;
        const s = Array.isArray(session) ? session[0] : session;
        return String(s?.tutor_id ?? "");
      }).filter(Boolean),
    ),
  ];

  const sessionIds = briefRows.map((row) => String(row.session_id));

  const [{ data: settings }, { data: targetRows }] = await Promise.all([
    supabase.from("user_settings").select("user_id, display_name").in("user_id", tutorIds),
    supabase
      .from("session_target_nodes")
      .select("session_id, skill_nodes(node_name)")
      .in("session_id", sessionIds),
  ]);

  const nameByGuide = new Map(
    (settings ?? []).map((row) => [String(row.user_id), String(row.display_name ?? "Guide")]),
  );

  const targetsBySession = new Map<string, string[]>();
  for (const row of targetRows ?? []) {
    const sessionId = String(row.session_id);
    const nodes = row.skill_nodes as { node_name: string } | { node_name: string }[] | null;
    const name = Array.isArray(nodes) ? nodes[0]?.node_name : nodes?.node_name;
    if (!name) continue;
    const list = targetsBySession.get(sessionId) ?? [];
    list.push(name);
    targetsBySession.set(sessionId, list);
  }

  const rows: BriefArchiveRow[] = [];
  for (const row of briefRows) {
    const session = row.sessions as
      | { start_time?: string; course?: string; tutor_id?: string }
      | { start_time?: string; course?: string; tutor_id?: string }[]
      | null;
    const s = Array.isArray(session) ? session[0] : session;
    const sessionId = String(row.session_id);
    rows.push({
      id: String(row.id),
      sessionId,
      sessionStartTime: String(s?.start_time ?? ""),
      course: String(s?.course ?? ""),
      guideName: nameByGuide.get(String(s?.tutor_id ?? "")) ?? "Guide",
      targetNodes: targetsBySession.get(sessionId) ?? [],
      likelyCoverage: (row.likely_coverage as string[]) ?? [],
      createdAt: String(row.created_at),
    });
  }

  return rows;
}

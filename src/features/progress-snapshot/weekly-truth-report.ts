import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { getVerdict } from "@/features/guidance/verdict-engine";
import { mondayUtcWeekKey } from "@/features/mastery-grid/grid-history-pure";
import type { ProgressSnapshotData } from "@/features/progress-snapshot/types";
import {
  assembleWeeklyTruthReport,
  pickLargestPositiveMove,
  pickStuckNode,
  type WeeklyTruthCauseFact,
  type WeeklyTruthReport,
} from "@/features/progress-snapshot/weekly-truth-report-pure";

export type { WeeklyTruthReport };

const MS_7D = 7 * 24 * 60 * 60 * 1000;

function priorWeekMonday(now = new Date()): string {
  const thisMonday = new Date(`${mondayUtcWeekKey(now)}T12:00:00.000Z`);
  const prior = new Date(thisMonday.getTime() - MS_7D);
  return prior.toISOString().slice(0, 10);
}

/**
 * Four deterministic truth sentences for the weekly progress email.
 * No Gemini. Reads rolling stats, prior mastery snapshot, retests, sessions.
 */
export async function generateWeeklyTruthReport(
  userId: string,
  options?: {
    now?: Date;
    snapshot?: ProgressSnapshotData | null;
    nextActionLabel?: string | null;
  },
): Promise<WeeklyTruthReport> {
  const now = options?.now ?? new Date();
  const admin = createAdminClient();
  const weekAgoIso = new Date(now.getTime() - MS_7D).toISOString();

  const { data: skillNodes } = await admin
    .from("skill_nodes")
    .select("id, node_name")
    .eq("subject", AP_CALC_AB_SUBJECT);

  const nodeNameById = new Map<string, string>();
  for (const row of skillNodes ?? []) {
    nodeNameById.set(String(row.id), String(row.node_name));
  }
  const nodeIds = [...nodeNameById.keys()];

  const [{ data: currentRows }, { data: priorSnap }, { data: knowledgeRows }] =
    await Promise.all([
      nodeIds.length
        ? admin
            .from("student_node_rolling_stats")
            .select("skill_node_id, rolling_accuracy, attempts_in_window")
            .eq("user_id", userId)
            .in("skill_node_id", nodeIds)
        : Promise.resolve({ data: [] as Array<{
            skill_node_id: string;
            rolling_accuracy: number;
            attempts_in_window: number;
          }> }),
      admin
        .from("mastery_grid_snapshots")
        .select("rolling_accuracy")
        .eq("user_id", userId)
        .eq("snapshot_week", priorWeekMonday(now))
        .maybeSingle(),
      nodeIds.length
        ? admin
            .from("student_knowledge_nodes")
            .select("skill_node_id, attempts, last_seen_at")
            .eq("user_id", userId)
            .eq("subject", AP_CALC_AB_SUBJECT)
            .in("skill_node_id", nodeIds)
            .gte("last_seen_at", weekAgoIso)
        : Promise.resolve({ data: [] as Array<{
            skill_node_id: string | null;
            attempts: number | null;
            last_seen_at: string | null;
          }> }),
    ]);

  const priorAccuracy =
    priorSnap?.rolling_accuracy &&
    typeof priorSnap.rolling_accuracy === "object" &&
    !Array.isArray(priorSnap.rolling_accuracy)
      ? (priorSnap.rolling_accuracy as Record<string, number>)
      : {};

  const compareRows = (currentRows ?? []).map((row) => {
    const skillNodeId = String(row.skill_node_id);
    const prior = priorAccuracy[skillNodeId];
    return {
      skillNodeId,
      nodeName: nodeNameById.get(skillNodeId) ?? "this skill",
      currentAccuracy: Number(row.rolling_accuracy ?? 0),
      priorAccuracy: prior == null ? null : Number(prior),
      attempts: Number(row.attempts_in_window ?? 0),
    };
  });

  const moved = pickLargestPositiveMove(compareRows);

  const weekAttemptsByNode = new Map<string, number>();
  for (const row of knowledgeRows ?? []) {
    const id = String(row.skill_node_id ?? "");
    if (!id) continue;
    weekAttemptsByNode.set(id, Number(row.attempts ?? 0));
  }

  const stuck = pickStuckNode(
    compareRows.map((row) => ({
      nodeName: row.nodeName,
      attempts: Math.max(
        weekAttemptsByNode.get(row.skillNodeId) ?? 0,
        row.attempts,
      ),
      currentAccuracy: row.currentAccuracy,
      priorAccuracy: row.priorAccuracy,
    })),
  );

  let cause: WeeklyTruthCauseFact = { kind: "none" };
  if (moved) {
    const { data: retest } = await admin
      .from("intervention_retests")
      .select("source_type, source_id, completed_at")
      .eq("user_id", userId)
      .eq("skill_node_id", moved.skillNodeId)
      .in("source_type", ["studio_package", "session"])
      .not("completed_at", "is", null)
      .gte("completed_at", weekAgoIso)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (retest?.source_id) {
      const { data: session } = await admin
        .from("sessions")
        .select("tutor_id")
        .eq("id", String(retest.source_id))
        .maybeSingle();

      if (session?.tutor_id) {
        const { data: guideSettings } = await admin
          .from("user_settings")
          .select("display_name")
          .eq("user_id", session.tutor_id)
          .maybeSingle();
        const guideName =
          typeof guideSettings?.display_name === "string" &&
          guideSettings.display_name.trim()
            ? guideSettings.display_name.trim()
            : "your Guide";
        cause = { kind: "guide", guideName };
      }
    }

    if (cause.kind === "none") {
      const practiceCount =
        weekAttemptsByNode.get(moved.skillNodeId) ??
        compareRows.find((r) => r.skillNodeId === moved.skillNodeId)?.attempts ??
        0;
      if (practiceCount > 0) {
        cause = { kind: "practice", sessionCount: practiceCount };
      }
    }
  }

  let nextActionLabel = options?.nextActionLabel ?? null;
  if (nextActionLabel == null) {
    try {
      const verdict = await getVerdict({
        type: "weekly_snapshot",
        userId,
        context: {
          ...(options?.snapshot ? { snapshot: options.snapshot } : {}),
          ...(moved ? { skillNodeId: moved.skillNodeId } : {}),
        },
      });
      nextActionLabel = verdict.nextAction.label;
    } catch {
      nextActionLabel = null;
    }
  }

  return assembleWeeklyTruthReport({
    moved,
    cause,
    stuck,
    nextActionLabel,
  });
}

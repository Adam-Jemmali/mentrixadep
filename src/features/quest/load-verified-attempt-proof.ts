"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  buildVerifiedAttemptCard,
  summarizeConstructionMix,
  type VerifiedAttemptCardModel,
} from "@/features/quest/verified-attempt-card-pure";

export type VerifiedAttemptProofPayload = {
  cards: VerifiedAttemptCardModel[];
  constructionMixLabel: string;
  constructionShare: number;
};

export async function loadVerifiedAttemptProofCards(
  limit = 12,
): Promise<VerifiedAttemptProofPayload> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("verified_first_attempts")
    .select(
      "skill_node_id, is_correct, accuracy_pct, attempt_format, attempted_at, skill_nodes(node_name, unit_name, unit_number, subject)",
    )
    .eq("user_id", user.id)
    .order("attempted_at", { ascending: false })
    .limit(Math.min(40, Math.max(1, limit)));

  if (error || !data?.length) {
    return {
      cards: [],
      constructionMixLabel: "No verified attempts yet.",
      constructionShare: 0,
    };
  }

  const cards: VerifiedAttemptCardModel[] = [];
  for (const row of data) {
    const node = Array.isArray(row.skill_nodes) ? row.skill_nodes[0] : row.skill_nodes;
    if (!node || typeof node !== "object") continue;
    const subject = String((node as { subject?: string }).subject ?? "");
    if (subject && subject !== AP_CALC_AB_SUBJECT) continue;
    cards.push(
      buildVerifiedAttemptCard({
        skillNodeId: String(row.skill_node_id),
        nodeName: String((node as { node_name?: string }).node_name ?? "Skill"),
        unitName: String((node as { unit_name?: string }).unit_name ?? "Unit"),
        unitNumber: Number((node as { unit_number?: number }).unit_number ?? 0),
        attemptFormat: String(row.attempt_format ?? "mcq"),
        isCorrect: Boolean(row.is_correct),
        accuracyPct: row.accuracy_pct as number | null,
        attemptedAt: String(row.attempted_at ?? new Date().toISOString()),
      }),
    );
  }

  const mix = summarizeConstructionMix(cards);
  return {
    cards: cards.slice(0, limit),
    constructionMixLabel: mix.label,
    constructionShare: mix.constructionShare,
  };
}

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { SubjectMomentumGate } from "@/features/subject-expansion/subject-expansion-pure";

export async function loadSubjectMomentumGates(): Promise<SubjectMomentumGate[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subject_momentum_gates")
    .select(
      "subject, momentum_eligible, min_verified_first_attempts, min_reviewed_items, eligible_at",
    )
    .order("subject", { ascending: true });

  if (error) {
    console.warn("[subject-gates] read failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    subject: String(row.subject),
    momentumEligible: row.momentum_eligible === true,
    minVerifiedFirstAttempts: Number(row.min_verified_first_attempts ?? 0),
    minReviewedItems: Number(row.min_reviewed_items ?? 0),
    eligibleAt: row.eligible_at ? String(row.eligible_at) : null,
  }));
}

export async function loadMomentumEligibleSubjects(): Promise<string[]> {
  const gates = await loadSubjectMomentumGates();
  return gates.filter((gate) => gate.momentumEligible).map((gate) => gate.subject);
}

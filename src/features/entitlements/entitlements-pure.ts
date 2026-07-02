import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import type { PackSprintState } from "@/features/entitlements/pack-sprint-pure";

export type StudentEntitlementId =
  | "arena.free"
  | "momentum.active"
  | "momentum.session_credit"
  | "momentum.member_session_rate"
  | "momentum.priority_retest"
  | "momentum.grid_history"
  | "momentum.progress_archive"
  | "momentum.loop_report_full"
  | "momentum.goal_dashboard"
  | "momentum.brief_early"
  | "momentum.impact_receipts"
  | "momentum.peer_trends"
  | "momentum.movement_receipt"
  | "momentum.trajectory_index"
  | "momentum.guide_memory"
  | "momentum.brief_archive"
  | "momentum.unified_trajectory"
  | "momentum.certificate_export";

export type StudentEntitlements = {
  userId: string;
  momentumActive: boolean;
  sessionCreditsRemaining: number;
  sessionCreditPeriodMonth: string | null;
  packSprint: PackSprintState | null;
  monthlyCreditsRemaining: number;
  memberSessionRateActive: boolean;
  entitlementIds: StudentEntitlementId[];
};

export function hasEntitlement(
  entitlements: Pick<StudentEntitlements, "entitlementIds">,
  id: StudentEntitlementId,
): boolean {
  return entitlements.entitlementIds.includes(id);
}

export function buildStudentEntitlements(input: {
  userId: string;
  subscription: StudentSubscriptionRow | null;
  sessionCreditsRemaining: number;
  sessionCreditPeriodMonth: string | null;
  packSprint?: PackSprintState | null;
  monthlyCreditsRemaining?: number;
}): StudentEntitlements {
  const momentumActive = isMomentumSubscriptionActive(input.subscription);
  const sessionCreditsRemaining = momentumActive ? input.sessionCreditsRemaining : 0;
  const memberSessionRateActive = momentumActive;

  const entitlementIds: StudentEntitlementId[] = ["arena.free"];
  if (momentumActive) {
    entitlementIds.push(
      "momentum.active",
      "momentum.member_session_rate",
      "momentum.priority_retest",
      "momentum.grid_history",
      "momentum.progress_archive",
      "momentum.loop_report_full",
      "momentum.goal_dashboard",
      "momentum.brief_early",
      "momentum.impact_receipts",
      "momentum.peer_trends",
      "momentum.movement_receipt",
      "momentum.trajectory_index",
      "momentum.guide_memory",
      "momentum.brief_archive",
      "momentum.unified_trajectory",
      "momentum.certificate_export",
    );
  }
  if (sessionCreditsRemaining > 0) {
    entitlementIds.push("momentum.session_credit");
  }

  return {
    userId: input.userId,
    momentumActive,
    sessionCreditsRemaining,
    sessionCreditPeriodMonth: sessionCreditsRemaining > 0 ? input.sessionCreditPeriodMonth : null,
    packSprint: input.packSprint ?? null,
    monthlyCreditsRemaining: input.monthlyCreditsRemaining ?? 0,
    memberSessionRateActive,
    entitlementIds,
  };
}

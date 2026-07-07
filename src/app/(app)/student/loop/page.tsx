import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";
import { loadLoopReportRows } from "@/features/intervention-retests/retest-reads";
import { LoopReportPageClient } from "./loop-report-client";

export default async function LoopReportPage() {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  const fullHistory = hasEntitlement(entitlements, "momentum.loop_report_full");
  const rows = await loadLoopReportRows(user.id, {
    fullHistory,
    limit: fullHistory ? 50 : 1,
  });

  const totalRowCount = fullHistory
    ? rows.length
    : (
        await loadLoopReportRows(user.id, {
          fullHistory: true,
          limit: 50,
        })
      ).length;

  return (
    <LoopReportPageClient
      rows={rows}
      momentumActive={entitlements.momentumActive}
      totalRowCount={totalRowCount}
    />
  );
}

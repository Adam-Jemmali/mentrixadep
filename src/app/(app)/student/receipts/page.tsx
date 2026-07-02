import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadMovementReceiptArchive } from "@/features/movement-receipt/load-receipt-archive";
import { ReceiptArchiveClient } from "./receipt-archive-client";

export default async function MovementReceiptArchivePage() {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  const receipts = await loadMovementReceiptArchive();

  return (
    <ReceiptArchiveClient
      receipts={receipts}
      momentumActive={entitlements.momentumActive}
    />
  );
}

import { createPayoutLedgerForSession } from "@/features/payments/payout-ledger";
import type { PayoutLedgerJobPayload } from "@/features/jobs/types";

export async function handlePayoutLedgerJob(
  payload: PayoutLedgerJobPayload,
): Promise<void> {
  const sessionId = payload.sessionId;
  if (!sessionId) throw new Error("payout.ledger: missing sessionId");
  await createPayoutLedgerForSession(sessionId);
}

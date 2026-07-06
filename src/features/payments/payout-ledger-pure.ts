/** Payout ledger UI + query constants (safe to import from client). */

export const PAYOUT_LEDGER_PAGE_SIZE = 10;

export type PayoutLedgerRow = {
  id: string;
  session_id: string | null;
  session_date: string | null;
  course: string | null;
  gross_cents: number;
  platform_fee_cents: number;
  net_cents: number;
  status: string;
  transfer_id: string | null;
  transferred_at: string | null;
  hold_until: string | null;
  created_at: string;
  student_id?: string | null;
  student_name?: string | null;
};

export type PayoutDashboardData = {
  connectStatus: import("@/features/payments/connect-onboarding").ConnectStatus;
  pendingCents: number;
  queuedCents: number;
  availableCents: number;
  lifetimeEarnedCents: number;
  ledger: PayoutLedgerRow[];
  ledgerTotalCount: number;
  ledgerPageSize: number;
};

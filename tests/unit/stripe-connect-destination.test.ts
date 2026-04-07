import { beforeEach, describe, expect, it, vi } from "vitest";

const transfersCreate = vi.fn();
const accountsRetrieve = vi.fn();
const accountsCreateLoginLink = vi.fn();
const accountLinksCreate = vi.fn();
const payoutsCreate = vi.fn();
const balanceRetrieve = vi.fn();

vi.mock("stripe", () => {
  return {
    default: class StripeMock {
      transfers = { create: transfersCreate };
      accounts = {
        retrieve: accountsRetrieve,
        createLoginLink: accountsCreateLoginLink,
      };
      accountLinks = { create: accountLinksCreate };
      payouts = { create: payoutsCreate };
      balance = { retrieve: balanceRetrieve };
    },
  };
});

vi.mock("@/lib/env", () => ({
  getStripeSecretKey: () => "sk_test_mock",
  env: {
    public: { appUrl: "http://localhost:3000" },
  },
  getCronSecret: () => "test_cron_secret",
}));

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async () => ({ id: "tutor_1", role: "tutor", approved: true })),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}));

describe("Stripe Connect destination-charge payout flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks destination-charge ledger rows as transferred (no separate Transfer API call)", async () => {
    const ledgerUpdateEq = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "tutor_payout_ledger") {
        return {
          select: () => ({
            eq: (_col: string, v: string) => ({
              single: async () => {
                if (v === "ledger_1") {
                  return {
                    data: {
                      id: "ledger_1",
                      status: "pending",
                      session_id: "session_1",
                      tutor_id: "tutor_1",
                      net_cents: 4000,
                    },
                  };
                }
                return { data: null };
              },
            }),
          }),
          update: () => ({
            eq: ledgerUpdateEq,
          }),
        };
      }

      if (table === "sessions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "session_1",
                  status: "scheduled",
                  start_time: "2026-04-07T00:00:00.000Z",
                  end_time: "2026-04-07T01:00:00.000Z",
                  stripe_destination_charge: true,
                  stripe_payment_intent_id: "pi_123",
                },
              }),
            }),
          }),
          update: () => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { transferSessionPayout } = await import("@/app/actions/stripe-connect");
    await transferSessionPayout("ledger_1");

    expect(ledgerUpdateEq).toHaveBeenCalledWith("id", "ledger_1");
    expect(transfersCreate).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/shared/integrations/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: rpcMock,
  }),
}));

describe("refresh-rank-cache-cron", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls refresh_ap_calc_verified_rank_cache_recent with a 10 minute window", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    rpcMock.mockResolvedValue({ data: 3, error: null });
    const { GET } = await import("@/features/rank-cache/refresh-rank-cache-cron");

    const response = await GET(
      new Request("http://localhost/api/cron/refresh-rank-cache", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(rpcMock).toHaveBeenCalledWith("refresh_ap_calc_verified_rank_cache_recent", {
      p_window: "10 minutes",
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rows_updated).toBe(3);
    expect(body.window_minutes).toBe(10);
  });
});

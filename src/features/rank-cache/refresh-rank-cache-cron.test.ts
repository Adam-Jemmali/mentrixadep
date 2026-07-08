import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const TEST_CRON_SECRET = "test-cron-secret";
const rpcMock = vi.fn();

vi.mock("@/shared/integrations/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: rpcMock,
  }),
}));

function cronRequest(secret = TEST_CRON_SECRET) {
  return new Request("http://localhost/api/cron/refresh-rank-cache", {
    headers: {
      Authorization: `Bearer ${secret}`,
      "x-forwarded-for": "127.0.0.1",
    },
  });
}

describe("refresh-rank-cache-cron", () => {
  const priorSecret = process.env.CRON_SECRET;
  const priorAllowedIps = process.env.CRON_ALLOWED_IPS;
  const priorRequireSig = process.env.CRON_REQUIRE_SIGNATURE;

  beforeEach(() => {
    rpcMock.mockReset();
    process.env.CRON_SECRET = TEST_CRON_SECRET;
    process.env.CRON_ALLOWED_IPS = "127.0.0.1";
    process.env.CRON_REQUIRE_SIGNATURE = "false";
  });

  afterEach(() => {
    if (priorSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = priorSecret;
    if (priorAllowedIps === undefined) delete process.env.CRON_ALLOWED_IPS;
    else process.env.CRON_ALLOWED_IPS = priorAllowedIps;
    if (priorRequireSig === undefined) delete process.env.CRON_REQUIRE_SIGNATURE;
    else process.env.CRON_REQUIRE_SIGNATURE = priorRequireSig;
  });

  it("calls refresh_ap_calc_verified_rank_cache_recent with a 10 minute window", async () => {
    rpcMock.mockResolvedValue({ data: 3, error: null });
    const { GET } = await import("@/features/rank-cache/refresh-rank-cache-cron");

    const response = await GET(cronRequest());

    expect(rpcMock).toHaveBeenCalledWith("refresh_ap_calc_verified_rank_cache_recent", {
      p_window: "10 minutes",
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rows_updated).toBe(3);
    expect(body.window_minutes).toBe(10);
  });
});

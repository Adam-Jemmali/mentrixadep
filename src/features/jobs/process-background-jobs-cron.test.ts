import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const TEST_CRON_SECRET = "test-cron-secret";
const processBackgroundJobsMock = vi.fn();

vi.mock("@/features/jobs/process", () => ({
  processBackgroundJobs: (...args: unknown[]) => processBackgroundJobsMock(...args),
}));

function cronRequest(secret = TEST_CRON_SECRET) {
  return new Request("http://localhost/api/cron/process-background-jobs", {
    headers: {
      Authorization: `Bearer ${secret}`,
      "x-forwarded-for": "127.0.0.1",
    },
  });
}

describe("process-background-jobs-cron", () => {
  const priorSecret = process.env.CRON_SECRET;
  const priorAllowedIps = process.env.CRON_ALLOWED_IPS;
  const priorRequireSig = process.env.CRON_REQUIRE_SIGNATURE;

  beforeEach(() => {
    processBackgroundJobsMock.mockReset();
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

  it("claims and processes up to 50 background jobs per run", async () => {
    processBackgroundJobsMock.mockResolvedValue({
      claimed: 4,
      completed: 3,
      retried: 1,
      failed: 0,
    });
    const { GET } = await import("@/features/jobs/process-background-jobs-cron");

    const response = await GET(cronRequest());

    expect(processBackgroundJobsMock).toHaveBeenCalledWith(50);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.job).toBe("process-background-jobs");
    expect(body.rows_scanned).toBe(4);
    expect(body.rows_updated).toBe(3);
    expect(body.rows_failed).toBe(0);
    expect(body.completed).toBe(3);
  });
});

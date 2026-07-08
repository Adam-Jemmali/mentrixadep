import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/shared/core/cron-auth";

const TEST_SECRET = "test-cron-secret-value";

function cronRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/process-background-jobs", {
    headers,
  });
}

describe("authorizeCronRequest", () => {
  const priorSecret = process.env.CRON_SECRET;
  const priorRequireSig = process.env.CRON_REQUIRE_SIGNATURE;

  beforeEach(() => {
    process.env.CRON_SECRET = TEST_SECRET;
    process.env.CRON_REQUIRE_SIGNATURE = "false";
  });

  afterEach(() => {
    if (priorSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = priorSecret;
    if (priorRequireSig === undefined) delete process.env.CRON_REQUIRE_SIGNATURE;
    else process.env.CRON_REQUIRE_SIGNATURE = priorRequireSig;
  });

  it("accepts Authorization Bearer secret", () => {
    const result = authorizeCronRequest(
      cronRequest({ Authorization: `Bearer ${TEST_SECRET}` }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("accepts x-cron-secret without Bearer", () => {
    const result = authorizeCronRequest(cronRequest({ "x-cron-secret": TEST_SECRET }));
    expect(result).toEqual({ ok: true });
  });

  it("accepts GitHub Actions style dual headers without x-forwarded-for", () => {
    const result = authorizeCronRequest(
      cronRequest({
        Authorization: `Bearer ${TEST_SECRET}`,
        "x-cron-secret": TEST_SECRET,
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects missing or wrong secret", () => {
    expect(authorizeCronRequest(cronRequest()).ok).toBe(false);
    const bad = authorizeCronRequest(cronRequest({ Authorization: "Bearer wrong" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.response).toBeInstanceOf(NextResponse);
      expect(bad.response.status).toBe(401);
    }
  });

  it("trims Bearer prefix whitespace drift", () => {
    const result = authorizeCronRequest(
      cronRequest({ Authorization: `Bearer  ${TEST_SECRET}  ` }),
    );
    expect(result).toEqual({ ok: true });
  });
});

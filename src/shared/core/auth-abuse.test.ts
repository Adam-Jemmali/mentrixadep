import { describe, expect, it } from "vitest";
import { compositeRateKey, emailLockKey, emailRateKey } from "@/shared/core/security/auth-abuse";

describe("auth abuse keys", () => {
  it("hashes email identifiers", () => {
    const key = emailRateKey("Test.User@example.com");
    expect(key).toMatch(/^auth:email:[a-f0-9]{64}$/);
    expect(key).not.toContain("test.user@example.com");
  });

  it("builds deterministic lock keys", () => {
    const a = emailLockKey("student@example.com");
    const b = emailLockKey("STUDENT@example.com");
    expect(a).toBe(b);
  });

  it("hashes composite ip-email keys", () => {
    const key = compositeRateKey("1.2.3.4", "student@example.com");
    expect(key).toMatch(/^auth:ip_email:[a-f0-9]{64}$/);
  });
});


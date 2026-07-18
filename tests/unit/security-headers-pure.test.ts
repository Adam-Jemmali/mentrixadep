import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  createCspNonce,
  isPublicCorsFeedPath,
  PERMISSIONS_POLICY,
} from "@/shared/core/security-headers-pure";

describe("security-headers-pure", () => {
  it("builds production CSP without unsafe-inline or unsafe-eval in script-src", () => {
    const csp = buildContentSecurityPolicy({ nonce: "testNonce123" });
    expect(csp).toContain("script-src ");
    expect(csp).toContain("'nonce-testNonce123'");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("allows unsafe-eval only in development", () => {
    const csp = buildContentSecurityPolicy({ nonce: "devNonce", isDev: true });
    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it("respects frame-ancestors override", () => {
    expect(buildContentSecurityPolicy({ nonce: "n", frameAncestors: "*" })).toContain(
      "frame-ancestors *",
    );
  });

  it("omits unrecognized Permissions-Policy features", () => {
    expect(PERMISSIONS_POLICY).not.toContain("identity-credentials-get");
    expect(PERMISSIONS_POLICY).toContain("camera=(self)");
    expect(PERMISSIONS_POLICY).toContain("payment=()");
  });

  it("creates unique nonces", () => {
    const a = createCspNonce();
    const b = createCspNonce();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it("identifies public CORS feed paths only", () => {
    expect(isPublicCorsFeedPath("/api/public/arena-feed")).toBe(true);
    expect(isPublicCorsFeedPath("/api/public/guide-feed/abc")).toBe(true);
    expect(isPublicCorsFeedPath("/")).toBe(false);
    expect(isPublicCorsFeedPath("/api/stats/landing")).toBe(false);
  });
});

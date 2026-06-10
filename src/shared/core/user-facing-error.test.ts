import { describe, expect, it } from "vitest";
import { toUserFacingAiError, toUserFacingApiError, toUserFacingAuthError } from "@/shared/core/user-facing-error";

describe("toUserFacingAuthError", () => {
  it("maps invalid credentials", () => {
    expect(toUserFacingAuthError("Invalid login credentials")).toContain("Incorrect email or password");
  });
});

describe("toUserFacingAiError", () => {
  it("hides raw provider errors", () => {
    const msg = toUserFacingAiError("SocketException: 503 quota project xyz internal stack");
    expect(msg).not.toContain("SocketException");
    expect(msg).not.toContain("project xyz");
  });

  it("returns timeout guidance", () => {
    expect(toUserFacingAiError(new Error("request timeout while calling provider"))).toContain("too long");
  });
});

describe("toUserFacingApiError", () => {
  it("normalizes unauthorized errors", () => {
    expect(toUserFacingApiError(new Error("forbidden"))).toContain("not allowed");
  });
});


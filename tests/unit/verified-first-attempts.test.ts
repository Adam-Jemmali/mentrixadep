import { describe, expect, it } from "vitest";
import { isVerifiedFirstAttemptConflict } from "@/features/quest/record-verified-first-attempts";

describe("verified first attempt conflict detection", () => {
  it("treats Postgres 23505 as duplicate user+skill node", () => {
    expect(isVerifiedFirstAttemptConflict({ code: "23505" })).toBe(true);
  });

  it("ignores other database errors", () => {
    expect(isVerifiedFirstAttemptConflict({ code: "23503" })).toBe(false);
    expect(isVerifiedFirstAttemptConflict(null)).toBe(false);
  });
});

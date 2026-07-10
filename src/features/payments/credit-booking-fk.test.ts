import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("credit booking availability FK migration", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/153-credit-redemption-availability-on-delete.sql"),
    "utf8",
  );

  it("clears redemption availability on slot delete", () => {
    expect(sql).toMatch(/momentum_session_credit_redemptions[\s\S]*ON DELETE SET NULL/);
  });

  it("keeps session_requests when slot is deleted", () => {
    expect(sql).toMatch(/session_requests[\s\S]*ON DELETE SET NULL/);
    expect(sql).toMatch(/ALTER COLUMN availability_id DROP NOT NULL/);
  });
});

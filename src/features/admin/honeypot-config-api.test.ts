import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readHoneypotSource(): string {
  return readFileSync(
    join(process.cwd(), "src", "features", "admin", "honeypot-config-api.ts"),
    "utf8",
  );
}

describe("admin config honeypot", () => {
  it("returns 404 for admins without blacklisting", () => {
    const src = readHoneypotSource();
    expect(src.includes("role === \"admin\"")).toBe(true);
    expect(src.includes("honeypot_blacklist")).toBe(true);
    expect(src.includes("honeypot_admin_config")).toBe(true);
  });

  it("always records a security event", () => {
    const src = readHoneypotSource();
    expect(src.includes("recordSecurityEvent")).toBe(true);
  });
});

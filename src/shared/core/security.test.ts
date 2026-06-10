import { describe, it, expect } from "vitest";
import { parseUUID, sanitizeString } from "@/shared/core/security";

describe("sanitizeString", () => {
  it("removes angle brackets", () => {
    expect(sanitizeString("<b>x</b>")).toBe("bx/b");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });
});

describe("parseUUID", () => {
  it("accepts a valid UUID", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const r = parseUUID(id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.id).toBe(id);
  });

  it("rejects invalid input", () => {
    expect(parseUUID("not-a-uuid").ok).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  formatPassportBio,
  formatPassportMemberSince,
  formatPassportMrz,
  formatPassportSexLabel,
  formatPassportTimezone,
  resolvePassportSignature,
} from "@/features/rank-card/rank-passport-identity-pure";

describe("rank passport identity pure", () => {
  it("formats sex labels", () => {
    expect(formatPassportSexLabel("feminine")).toBe("Feminine");
    expect(formatPassportSexLabel("masculine")).toBe("Masculine");
    expect(formatPassportSexLabel(null)).toBe("Not set");
  });

  it("formats member since and timezone", () => {
    expect(formatPassportMemberSince("2024-07-03T12:00:00.000Z")).toMatch(/Jul 3, 2024/);
    expect(formatPassportTimezone("America/New_York")).toBe("America/New York");
  });

  it("resolves signature fallback", () => {
    expect(resolvePassportSignature(null, "trapdime")).toBe("trapdime");
    expect(resolvePassportSignature("  TD  ", "trapdime")).toBe("TD");
  });

  it("builds mrz line", () => {
    expect(formatPassportMrz("trapdime", "AP Calculus AB")).toContain("TRAPDIME");
  });

  it("truncates long bio", () => {
    const long = "a".repeat(150);
    expect(formatPassportBio(long).length).toBeLessThanOrEqual(140);
  });
});

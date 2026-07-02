import { describe, expect, it } from "vitest";
import {
  buildTrajectoryCertificateVerdict,
  verifiedPercentileGoldStyle,
} from "@/features/trajectory-index/trajectory-certificate-pure";

describe("trajectory-certificate-pure", () => {
  it("uses gold only on verified percentile styling", () => {
    expect(verifiedPercentileGoldStyle().color).toBe("#D4A017");
  });

  it("ends with verdict and next action", () => {
    const copy = buildTrajectoryCertificateVerdict({
      studentName: "Alex",
      subject: "AP Calculus AB",
      verifiedPercentile: 82,
      trajectoryScore: 71,
      generatedOn: "2026-07-01",
      archiveWeeks: 8,
    });
    expect(copy.verdict).toContain("82");
    expect(copy.nextAction).toContain("Print");
  });
});

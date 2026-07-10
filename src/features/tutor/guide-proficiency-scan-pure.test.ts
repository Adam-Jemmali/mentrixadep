import { describe, expect, it } from "vitest";
import { scanGuideProficiencyProof } from "@/features/tutor/guide-proficiency-scan-pure";

describe("scanGuideProficiencyProof", () => {
  it("verifies mastery text plus any https link", () => {
    const result = scanGuideProficiencyProof({
      proofDescription: "AP Calculus AB score 5. TA for two semesters.",
      evidenceUrl: "https://example.com/my-portfolio",
    });
    expect(result.verdict).toBe("verified");
    expect(result.checks.every((c) => c.pass)).toBe(true);
    expect(result.verdictSentence).toMatch(/verified/i);
  });

  it("requires revision when mastery signal is missing", () => {
    const result = scanGuideProficiencyProof({
      proofDescription: "I like calculus.",
      evidenceUrl: "https://example.com/note",
    });
    expect(result.verdict).toBe("needs_revision");
    expect(result.checks.find((c) => c.id === "mastery_signal")?.pass).toBe(false);
  });

  it("does not require a PDF or image URL", () => {
    const result = scanGuideProficiencyProof({
      proofDescription: "AP 5 on Calculus AB. Private tutor for 3 years.",
      evidenceUrl: "https://linkedin.com/in/guide-example",
    });
    expect(result.verdict).toBe("verified");
    expect(result.checks.find((c) => c.id === "evidence_link")?.pass).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { scanGuideProficiencyProof } from "@/features/tutor/guide-proficiency-scan-pure";

describe("scanGuideProficiencyProof", () => {
  it("verifies strong AP Calc AB proof with transcript URL", () => {
    const result = scanGuideProficiencyProof({
      proofDescription: "AP Calculus AB score 5. TA for two semesters. 200+ coaching sessions.",
      evidenceUrl: "https://example.com/ap-transcript.pdf",
    });
    expect(result.verdict).toBe("verified");
    expect(result.checks.every((c) => c.pass)).toBe(true);
    expect(result.verdictSentence).toMatch(/verified/i);
  });

  it("requires revision when mastery signal is missing", () => {
    const result = scanGuideProficiencyProof({
      proofDescription: "I like calculus.",
      evidenceUrl: "https://example.com/note.pdf",
    });
    expect(result.verdict).toBe("needs_revision");
    expect(result.checks.find((c) => c.id === "mastery_signal")?.pass).toBe(false);
  });

  it("accepts tutor-evidence storage uploads", () => {
    const result = scanGuideProficiencyProof({
      proofDescription: "AP 5 on Calculus AB. Private tutor for 3 years.",
      evidenceUrl: "https://cdn.example.com/storage/v1/object/public/tutor-evidence/u1/file.pdf",
    });
    expect(result.checks.find((c) => c.id === "evidence_format")?.pass).toBe(true);
  });
});

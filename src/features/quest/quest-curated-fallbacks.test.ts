import { describe, expect, it } from "vitest";
import { buildQuestFallbackResponse } from "@/features/quest/quest-internal";
import {
  isComputationalQuestPrompt,
  matchCuratedQuestFallback,
} from "@/features/quest/quest-curated-fallbacks";

describe("quest curated fallbacks", () => {
  it("returns stack vs heap content for memory questions", () => {
    const result = buildQuestFallbackResponse(
      "Difference between stack and heap?",
      "exam",
      "coach"
    );
    expect(result.hints[0]?.toLowerCase()).toContain("stack");
    expect(result.hints[1]?.toLowerCase()).toContain("heap");
    expect(result.finalAnswer.toLowerCase()).toContain("first-out");
    expect(result.reasoning.toLowerCase()).toContain("heap");
    expect(result.reasoning).not.toContain("Fallback guidance");
  });

  it("matches big o and dynamic programming prompts", () => {
    expect(matchCuratedQuestFallback("How does Big O notation work?", "coach")).not.toBeNull();
    expect(matchCuratedQuestFallback("Explain dynamic programming.", "coach")).not.toBeNull();
  });

  it("uses conceptual fallback for non-computational unknown topics", () => {
    expect(isComputationalQuestPrompt("Difference between TCP and UDP")).toBe(false);
    const result = buildQuestFallbackResponse("Difference between TCP and UDP", "exam", "coach");
    expect(result.hints[0]).toContain("Define the key terms");
    expect(result.finalAnswer).toContain("defines each term");
  });
});

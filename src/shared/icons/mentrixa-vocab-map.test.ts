import { describe, expect, it } from "vitest";
import {
  CORE_VOCAB_ICON_NAMES,
  VOCAB_ICON_NAMES,
  VOCAB_ICON_REGISTRY,
  getVocabIconMeta,
  vocabIconSrc,
  vocabIconsByCategory,
} from "@/shared/icons/mentrixa-vocab-map";

describe("mentrixa-vocab-map", () => {
  it("registers every checklist name with a unique key", () => {
    expect(VOCAB_ICON_NAMES.length).toBe(83);
    const unique = new Set(VOCAB_ICON_NAMES);
    expect(unique.size).toBe(VOCAB_ICON_NAMES.length);
  });

  it("resolves vocab and guide-rank asset paths", () => {
    expect(vocabIconSrc("quest")).toBe("/icons/vocab/quest.svg");
    expect(vocabIconSrc("xp")).toBe("/images/xp.webp");
    expect(vocabIconSrc("momentum-membership")).toBe("/icons/vocab/momentum.svg");
    expect(vocabIconSrc("practitioner")).toBe("/icons/guide-ranks/practitioner.svg");
  });

  it("groups icons by category", () => {
    const guideRanks = vocabIconsByCategory("guide-rank");
    expect(guideRanks).toHaveLength(5);
    expect(guideRanks.map((r) => r.name)).toContain("elite");
  });

  it("marks verified-truth icons for gold styling", () => {
    expect(VOCAB_ICON_REGISTRY.verified.allowsGold).toBe(true);
    expect(VOCAB_ICON_REGISTRY["rank-proof"].allowsGold).toBe(true);
    expect(VOCAB_ICON_REGISTRY.quest.allowsGold).toBeUndefined();
  });

  it("exposes src on getVocabIconMeta", () => {
    const meta = getVocabIconMeta("momentum");
    expect(meta.label).toBe("Momentum");
    expect(meta.src).toBe("/icons/vocab/momentum.svg");
    expect(getVocabIconMeta("xp").src).toBe("/images/xp.webp");
  });

  it("lists the Phase 2 core 18 vocabulary", () => {
    expect(CORE_VOCAB_ICON_NAMES).toHaveLength(18);
    expect(CORE_VOCAB_ICON_NAMES).toContain("guide-session");
    expect(vocabIconSrc("guide-session")).toBe("/icons/vocab/guide-session.svg");
  });
});

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VOCAB_ICON_NAMES, vocabIconSrc } from "@/shared/icons/mentrixa-vocab-map";
import {
  CANONICAL_DUELS_ICON,
  CANONICAL_LEAGUE_ICON,
  CANONICAL_QUEST_ICON,
  CANONICAL_RECEIPT_ICON,
  CANONICAL_SESSION_ICON,
  resolveCanonicalVocabIcon,
  vocabIconAliasGroups,
} from "@/shared/icons/vocab-canonical";

const PUBLIC_ROOT = join(process.cwd(), "public");

describe("vocab-canonical", () => {
  it("resolves product noun aliases to one icon each", () => {
    expect(resolveCanonicalVocabIcon("bento-quest-practice")).toBe(CANONICAL_QUEST_ICON);
    expect(resolveCanonicalVocabIcon("practice-pack")).toBe("practice-pack");
    expect(resolveCanonicalVocabIcon("bento-skill-duels")).toBe(CANONICAL_DUELS_ICON);
    expect(resolveCanonicalVocabIcon("division-war")).toBe(CANONICAL_DUELS_ICON);
    expect(resolveCanonicalVocabIcon("arena")).toBe("tier-arena");
    expect(resolveCanonicalVocabIcon("leaderboard")).toBe(CANONICAL_LEAGUE_ICON);
    expect(resolveCanonicalVocabIcon("division")).toBe(CANONICAL_LEAGUE_ICON);
    expect(resolveCanonicalVocabIcon("movement-receipt")).toBe(CANONICAL_RECEIPT_ICON);
    expect(resolveCanonicalVocabIcon("guide-session")).toBe(CANONICAL_SESSION_ICON);
    expect(resolveCanonicalVocabIcon("bento-session-room")).toBe(CANONICAL_SESSION_ICON);
    expect(resolveCanonicalVocabIcon("momentum-membership")).toBe("tier-momentum");
    expect(resolveCanonicalVocabIcon("breakthrough")).toBe("tier-breakthrough");
    expect(resolveCanonicalVocabIcon("momentum")).toBe("tier-momentum");
  });

  it("keeps practice-pack separate from quest", () => {
    expect(resolveCanonicalVocabIcon("practice-pack")).not.toBe(CANONICAL_QUEST_ICON);
    expect(resolveCanonicalVocabIcon("retest")).toBe(CANONICAL_QUEST_ICON);
  });

  it("resolves pricing tier icons to dedicated sticker assets", () => {
    expect(vocabIconSrc("tier-arena")).toBe("/icons/vocab/tier-arena.svg");
    expect(vocabIconSrc("tier-breakthrough")).toBe("/icons/vocab/tier-breakthrough.svg");
    expect(vocabIconSrc("tier-momentum")).toBe("/icons/vocab/tier-momentum.svg");
    expect(resolveCanonicalVocabIcon("tier-arena")).toBe("tier-arena");
  });

  it("maps every alias to the same src as its canonical icon", () => {
    for (const [, aliases] of vocabIconAliasGroups()) {
      for (const alias of aliases) {
        const canonical = resolveCanonicalVocabIcon(alias);
        expect(vocabIconSrc(alias)).toBe(vocabIconSrc(canonical));
      }
    }
  });

  it("resolves every vocab name to an existing asset path", () => {
    for (const name of VOCAB_ICON_NAMES) {
      const src = vocabIconSrc(name);
      const diskPath = join(PUBLIC_ROOT, src.replace(/^\//, ""));
      expect(existsSync(diskPath), `${name} → ${src}`).toBe(true);
    }
  });
});

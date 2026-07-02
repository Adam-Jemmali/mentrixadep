import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { hasInlineVocabIcon, renderInlineVocabIcon } from "@/shared/icons/vocab-inline-svgs";

describe("vocab-inline-svgs", () => {
  it("inlines home, profile, booking, and momentum artwork", () => {
    for (const name of ["home", "profile", "booking", "momentum", "momentum-membership"] as const) {
      expect(hasInlineVocabIcon(name)).toBe(true);
      const markup = renderToStaticMarkup(
        renderInlineVocabIcon(name, { size: 24, surface: "dark", gold: false }),
      );
      expect(markup).toContain('viewBox="0 0 48 48"');
      expect(markup).toContain('stroke="#FFFFFF"');
    }
  });

  it("uses dark strokes on light surfaces", () => {
    const markup = renderToStaticMarkup(
      renderInlineVocabIcon("profile", { size: 24, surface: "light", gold: false }),
    );
    expect(markup).toContain('stroke="#000000"');
  });
});

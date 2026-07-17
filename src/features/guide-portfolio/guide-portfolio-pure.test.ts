import { describe, expect, it } from "vitest";
import {
  formatPortfolioAccuracy,
  portfolioOptInBody,
  shouldShowGuidePortfolio,
  sliceGuidePortfolioCards,
} from "@/features/guide-portfolio/guide-portfolio-pure";

describe("guide portfolio pure", () => {
  it("requires three approved cards before public display", () => {
    expect(shouldShowGuidePortfolio(2)).toBe(false);
    expect(shouldShowGuidePortfolio(3)).toBe(true);
  });

  it("caps visible cards at nine", () => {
    const cards = Array.from({ length: 12 }, (_, i) => i);
    const sliced = sliceGuidePortfolioCards(cards);
    expect(sliced.visible).toHaveLength(9);
    expect(sliced.hasMore).toBe(true);
    expect(sliced.total).toBe(12);
  });

  it("keeps opt-in copy brief", () => {
    expect(portfolioOptInBody("Jordan", "Chain Rule")).toBe(
      "Jordan wants your Chain Rule lift on their portfolio. Name stays private. Approve or skip.",
    );
    expect(formatPortfolioAccuracy(73.4)).toBe("73%");
  });
});

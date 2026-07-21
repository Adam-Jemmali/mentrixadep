/** Guide teaching portfolio display rules. No AI. */

export const GUIDE_PORTFOLIO_MIN_PUBLIC = 3;
export const GUIDE_PORTFOLIO_MAX_CARDS = 9;

export type GuidePortfolioCard = {
  id: string;
  nodeName: string;
  beforeAccuracy: number;
  afterAccuracy: number;
  addedAt?: string;
};

export function shouldShowGuidePortfolio(approvedCount: number): boolean {
  return approvedCount >= GUIDE_PORTFOLIO_MIN_PUBLIC;
}

export function sliceGuidePortfolioCards<T>(
  cards: T[],
  max = GUIDE_PORTFOLIO_MAX_CARDS,
): { visible: T[]; hasMore: boolean; total: number } {
  const total = cards.length;
  return {
    visible: cards.slice(0, max),
    hasMore: total > max,
    total,
  };
}

export function formatPortfolioAccuracy(value: number): string {
  return `${Math.round(value)}%`;
}

export function portfolioOptInBody(guideName: string, nodeName: string): string {
  const guide = guideName.trim() || "Your Guide";
  const node = nodeName.trim() || "this skill";
  return `${guide} wants your ${node} lift on their portfolio. Name stays private. Approve or skip.`;
}

export const GUIDE_PORTFOLIO_SECTION_TITLE = "Students I have helped break through";
export const GUIDE_PORTFOLIO_SHOW_MORE = "Show more";

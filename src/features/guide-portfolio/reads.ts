import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  GUIDE_PORTFOLIO_MAX_CARDS,
  shouldShowGuidePortfolio,
  sliceGuidePortfolioCards,
  type GuidePortfolioCard,
} from "@/features/guide-portfolio/guide-portfolio-pure";

export type GuidePortfolioPublicSection = {
  cards: GuidePortfolioCard[];
  hasMore: boolean;
  total: number;
} | null;

/** Approved breakthrough cards for a Guide public profile. Null when under threshold. */
export async function loadGuidePortfolioForPublic(
  guideId: string,
  options?: { max?: number },
): Promise<GuidePortfolioPublicSection> {
  const admin = createAdminClient();
  const max = options?.max ?? GUIDE_PORTFOLIO_MAX_CARDS;

  const { data, error } = await admin
    .from("guide_teaching_portfolio")
    .select("id, node_name, before_accuracy, after_accuracy")
    .eq("guide_id", guideId)
    .eq("student_opted_in", true)
    .order("added_at", { ascending: false })
    .limit(Math.max(max + 1, 24));

  if (error) {
    console.error("[loadGuidePortfolioForPublic]", error.message);
    return null;
  }

  const all: GuidePortfolioCard[] = (data ?? []).map((row) => ({
    id: String(row.id),
    nodeName: String(row.node_name ?? "Skill"),
    beforeAccuracy: Number(row.before_accuracy ?? 0),
    afterAccuracy: Number(row.after_accuracy ?? 0),
  }));

  if (!shouldShowGuidePortfolio(all.length)) return null;

  const sliced = sliceGuidePortfolioCards(all, max);
  return {
    cards: sliced.visible,
    hasMore: sliced.hasMore,
    total: sliced.total,
  };
}

/** Full approved list for the Show more page. */
export async function loadGuidePortfolioAll(
  guideId: string,
): Promise<GuidePortfolioCard[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("guide_teaching_portfolio")
    .select("id, node_name, before_accuracy, after_accuracy")
    .eq("guide_id", guideId)
    .eq("student_opted_in", true)
    .order("added_at", { ascending: false })
    .limit(48);

  if (error) {
    console.error("[loadGuidePortfolioAll]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    nodeName: String(row.node_name ?? "Skill"),
    beforeAccuracy: Number(row.before_accuracy ?? 0),
    afterAccuracy: Number(row.after_accuracy ?? 0),
  }));
}

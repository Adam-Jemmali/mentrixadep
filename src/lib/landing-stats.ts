/**
 * Marketing landing uses outcome-only copy (no inflated metrics).
 * When you have real aggregates to show, add a cached loader here and pass into HomePageClient.
 */

export type LandingStatItem = {
  value: number;
  label: string;
  suffix?: string;
};

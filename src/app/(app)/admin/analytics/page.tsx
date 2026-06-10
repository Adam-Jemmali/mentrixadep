import {
  getEventCounts,
  getDailyRevenue,
  getActivationFunnel,
  getPopularSubjects,
  getKpiMetrics,
  getDailyEventCounts,
} from "@/shared/integrations/analytics";
import { AnalyticsDashboardClient } from "./analytics-client";

export const metadata = { title: "Analytics · Mentrixa Admin" };
export const revalidate = 300; // 5 min cache

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const rawDays = Number(daysParam ?? "7");
  const days: 7 | 30 = rawDays === 30 ? 30 : 7;

  const [kpis, eventCounts, funnel, subjects, revenue, dailySignups, dailyQuests] =
    await Promise.all([
      getKpiMetrics(),
      getEventCounts(days),
      getActivationFunnel(),
      getPopularSubjects(8),
      getDailyRevenue(days),
      getDailyEventCounts("signup_completed", days),
      getDailyEventCounts("quest_started", days),
    ]);

  return (
    <AnalyticsDashboardClient
      days={days}
      kpis={kpis}
      eventCounts={eventCounts}
      funnel={funnel}
      subjects={subjects}
      revenue={revenue}
      dailySignups={dailySignups}
      dailyQuests={dailyQuests}
    />
  );
}

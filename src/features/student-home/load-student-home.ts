import { getTopRival } from "@/features/divisions/top-rival";
import { loadDueRetestNodes } from "@/features/student-home/load-due-retests";
import { loadRecentQuestPerformance } from "@/features/student-home/load-recent-quest-performance";
import { buildApReadinessBand } from "@/features/student-home/ap-readiness-band-pure";
import { buildStudentHomeVerdictHero } from "@/features/student-home/student-home-verdict-pure";
import { loadLiveBoardEvents } from "@/features/live-board/load-live-board-snapshot";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { getMatchmakerGuides } from "@/features/matchmaker/matchmaker";
import { getStudentSessionsHubBundle, getStudentHubSnapshot } from "@/features/student-profile/hub-snapshot";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import type { TopRivalData } from "@/features/divisions/top-rival";
import type { MatchmakerGuideResult } from "@/features/matchmaker/matchmaker-pure";
import {
  loadVerifiedFirstAttemptRankStats,
  type VerifiedFirstAttemptRankStats,
} from "@/features/xp/calibrated-rank";
import type { ApReadinessBandView } from "@/features/student-home/ap-readiness-band-pure";
import type { StudentHomeVerdictView } from "@/features/student-home/student-home-verdict-pure";
import type { DueRetestNode } from "@/features/student-home/load-due-retests";
import type { RecentQuestPerformanceRow } from "@/features/student-home/load-recent-quest-performance";

export type StudentHomeUpcomingSession = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  tutor_name: string;
  tutor_avatar_url: string | null;
};

export type StudentHomeData = {
  subject: string;
  heroVerdict: StudentHomeVerdictView;
  rankStats: VerifiedFirstAttemptRankStats;
  apReadinessBand: ApReadinessBandView;
  masteryGrid: MasteryGridData | null;
  dueRetests: DueRetestNode[];
  upcomingSessions: StudentHomeUpcomingSession[];
  recentQuests: RecentQuestPerformanceRow[];
  arenaPreview: LiveBoardEventRow[];
  recommendedGuide: MatchmakerGuideResult | null;
  division: TopRivalData;
  timeZone: string;
};

export async function loadStudentHome(userId: string): Promise<StudentHomeData> {
  const [
    rankStats,
    masteryGrid,
    sessionsBundle,
    snapshot,
    dueRetests,
    recentQuests,
    arenaPreview,
    division,
    matchmaker,
  ] = await Promise.all([
    loadVerifiedFirstAttemptRankStats(userId),
    loadMasteryGrid(userId).catch(() => null),
    getStudentSessionsHubBundle(),
    getStudentHubSnapshot(),
    loadDueRetestNodes(userId),
    loadRecentQuestPerformance(userId, 3),
    loadLiveBoardEvents(3),
    getTopRival(),
    getMatchmakerGuides(userId).catch(() => ({ guides: [] as MatchmakerGuideResult[] })),
  ]);

  const upcomingSessions = sessionsBundle.upcomingSessions.map((s: Record<string, unknown>) => ({
    id: String(s.id),
    course: String(s.course),
    start_time: String(s.start_time),
    end_time: String(s.end_time),
    tutor_name:
      (s.tutor as { display_name?: string } | undefined)?.display_name?.trim() ||
      "Guide",
    tutor_avatar_url: (s.tutor as { avatar_url?: string | null } | undefined)?.avatar_url ?? null,
  }));

  return {
    subject: AP_CALC_AB_SUBJECT,
    heroVerdict: buildStudentHomeVerdictHero(rankStats, masteryGrid?.verdict?.nextAction ?? null),
    rankStats,
    apReadinessBand: buildApReadinessBand(rankStats),
    masteryGrid,
    dueRetests,
    upcomingSessions,
    recentQuests,
    arenaPreview,
    recommendedGuide: matchmaker.guides[0] ?? null,
    division,
    timeZone: snapshot.user_settings?.timezone?.trim() || "UTC",
  };
}

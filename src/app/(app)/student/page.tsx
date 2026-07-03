import Link from "next/link";
import { Suspense } from "react";
import { StudentHeroGreeting } from "@/features/student-profile/ui/student-hero-greeting";
import { StudentHeroQuickActions } from "@/features/student-profile/ui/student-hero-quick-actions";
import { VerifiedRankHeroStrip } from "@/features/student-profile/ui/verified-rank-hero-strip";

import { requireRole } from "@/shared/core/auth";
import {
  getTutorAvailability,
} from "@/features/booking/browse-availability";
import {
  getStudentHubSnapshot,
  getStudentSessionsHubBundle,
} from "@/features/student-profile/hub-snapshot";
import { getTopRival } from "@/features/divisions/top-rival";
import { getQuestAccuracyTrend } from "@/features/quest/quest-reads";
import { getActiveProgressSnapshot } from "@/features/progress-snapshot/reads";
import type { StudentCourse, UserXp } from "@/shared/types/database";
import {
  formatVerifiedRankNextAction,
  loadVerifiedFirstAttemptRankStats,
} from "@/features/xp/calibrated-rank";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { StreakCountDisplay, XpCountDisplay, MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_QUEST_ICON } from "@/shared/icons/vocab-canonical";

import { getWeekRangeUTC } from "@/shared/core/time-format";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  DeferredPreSessionBriefCard,
  DeferredProgressSnapshotCard,
  DeferredSessionsList,
  DeferredStudentGoalCaptureCard,
  DeferredStudentCommandCenterClient,
  DeferredStudentStudyPackageNotifier,
  DeferredTopRivalCard,
} from "./student-dashboard-deferred";
import {
  firstNameFromDisplayName,
  getLocalHour,
  greetingForHour,
  isStreakAtRisk18h,
} from "@/features/student-profile/student-dashboard-helpers";
import { getUpcomingSessionBriefs } from "@/features/pre-session-brief/brief";
import { StudentHubRealtimeRefresh } from "@/components/student-hub-realtime-refresh";
import {
  getGuideImpactScoresMap,
  getStudentQuestCourseNames,
} from "@/features/guide-impact/reads";
import { getGuideRanksMap } from "@/features/guide-rank/reads";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { MasteryGridHubCard } from "@/features/mastery-grid/mastery-grid-hub-card";
import { loadActiveStudentGoalForViewer } from "@/features/student-goals/load-student-goal";
import {
  getStudentEntitlements,
  hasEntitlement,
} from "@/features/entitlements/entitlements";
import { loadNextPendingRetest, loadLoopReportRows } from "@/features/intervention-retests/retest-reads";
import { RetestCountdownHubCard } from "@/features/intervention-retests/ui/retest-countdown-hub-card";
import { LoopReportHubCard } from "@/features/loop-report/ui/loop-report-hub-card";
import { loadGoalDashboardForViewer } from "@/features/goal-dashboard/load-goal-dashboard";
import { GoalDashboardCard } from "@/features/goal-dashboard/ui/goal-dashboard-card";
import { loadGuideImpactReceipts } from "@/features/guide-impact/impact-receipt-reads";
import { GuideImpactReceiptCard } from "@/features/guide-impact/ui/guide-impact-receipt-card";
import { loadActiveMovementReceiptForViewer } from "@/features/movement-receipt/load-movement-receipt";
import { MovementReceiptHubCard } from "@/features/movement-receipt/ui/movement-receipt-hub-card";
import { loadTrajectoryIndexForViewer } from "@/features/trajectory-index/load-trajectory-index";
import { TrajectoryIndexHubCard } from "@/features/trajectory-index/ui/trajectory-index-hub-card";
import { loadUnifiedTrajectoryIndexForViewer } from "@/features/trajectory-index/load-unified-trajectory-index";
import { UnifiedTrajectoryHubCard } from "@/features/trajectory-index/ui/unified-trajectory-hub-card";
import { getGuideRematchBadgesForStudent } from "@/features/matchmaker/load-guide-rematch-badges";
import { loadGuideMemoryForSession } from "@/features/guide-memory/load-guide-memory";
import { isGuideMemoryWindowOpen } from "@/features/guide-memory/guide-memory-pure";
import { GuideMemoryPanel } from "@/features/guide-memory/ui/guide-memory-panel";
import { getActivePackSprintState } from "@/features/entitlements/session-credits";
import { PackSprintSuccessPanel } from "@/features/entitlements/ui/pack-sprint-success-panel";
import { daysUntilDate } from "@/features/goal-dashboard/goal-dashboard-pure";

interface StudentPageProps {
  searchParams: Promise<{
    booking?: string;
    reason?: string;
    openStudyPackage?: string;
    sessionsTab?: string;
  }>;
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const query = await searchParams;
  const user = await requireRole(["student", "admin"]);
  const now = new Date();

  const [snapshot, sessionsBundle, sessionBriefs, availability, rivalData, questAccuracy, progressSnapshot, verifiedRankStats, masteryGrid, activeGoal, entitlements, pendingRetest, goalDashboard, impactReceipts, movementReceipt, trajectoryIndex, unifiedTrajectory] =
    await Promise.all([
      getStudentHubSnapshot(),
      getStudentSessionsHubBundle(),
      getUpcomingSessionBriefs().catch(() => []),
      getTutorAvailability(),
      getTopRival(),
      getQuestAccuracyTrend(user.id),
      getActiveProgressSnapshot().catch(() => null),
      loadVerifiedFirstAttemptRankStats(user.id),
      loadMasteryGrid(user.id).catch(() => null),
      loadActiveStudentGoalForViewer(AP_CALC_AB_SUBJECT),
      getStudentEntitlements(user.id),
      loadNextPendingRetest(user.id).catch(() => null),
      loadGoalDashboardForViewer().catch(() => null),
      loadGuideImpactReceipts(user.id, {
        fullHistory: false,
        limit: 1,
      }).catch(() => []),
      loadActiveMovementReceiptForViewer().catch(() => null),
      loadTrajectoryIndexForViewer().catch(() => null),
      loadUnifiedTrajectoryIndexForViewer().catch(() => null),
    ]);

  const momentumSubscriber = entitlements.momentumActive;
  const archiveSubscriber = entitlements.momentumActive;
  const sessionCreditAvailable = entitlements.sessionCreditsRemaining > 0;

  const loopRows = await loadLoopReportRows(user.id, {
    fullHistory: hasEntitlement(entitlements, "momentum.loop_report_full"),
    limit: hasEntitlement(entitlements, "momentum.loop_report_full") ? 50 : 1,
  }).catch(() => []);

  const impactReceiptsFull = momentumSubscriber
    ? await loadGuideImpactReceipts(user.id, { fullHistory: true, limit: 20 }).catch(() => impactReceipts)
    : impactReceipts;

  const tutorIdsForImpact = Array.from(new Set(availability.map((a) => a.tutor_id)));
  const [guideImpactByTutorId, rawQuestHistorySubjects, guideRankByTutorId, rematchBadgesByTutorId] = await Promise.all([
    getGuideImpactScoresMap(tutorIdsForImpact).catch(() => ({})),
    getStudentQuestCourseNames(user.id).catch(() => [] as string[]),
    getGuideRanksMap(tutorIdsForImpact).catch(() => ({})),
    getGuideRematchBadgesForStudent(user.id, tutorIdsForImpact).catch(() => ({})),
  ]);
  const questHistorySubjects = rawQuestHistorySubjects.filter((s) => s === AP_CALC_AB_SUBJECT);

  const { upcomingSessions, pastSessions } = sessionsBundle;

  const userXp = (snapshot.user_xp as UserXp | null) ?? null;
  const studentCourses = snapshot.student_courses as unknown as StudentCourse[];
  const tutorExpertise = snapshot.tutor_expertise;
  const courses = snapshot.available_courses.filter((c) => c === AP_CALC_AB_SUBJECT);

  const settingsRow = snapshot.user_settings;
  const timeZone = settingsRow?.timezone?.trim() || "UTC";
  const firstName = firstNameFromDisplayName(settingsRow?.display_name, user.email ?? "");
  const hour = getLocalHour(now, timeZone);
  const greeting = greetingForHour(hour, firstName);
  const totalXp = userXp?.total_xp ?? 0;
  const streak = userXp?.streak_days ?? 0;
  const lastActivityAt = (userXp?.last_activity_at as string | null | undefined) ?? null;
  const streakAtRisk = isStreakAtRisk18h(streak, lastActivityAt);

  const accountRank = getAccountRankFromTotalXp(totalXp);
  const rankNextAction = formatVerifiedRankNextAction(verifiedRankStats);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studyPackageSnapshots = [...pastSessions, ...upcomingSessions].map((s: any) => ({
    sessionId: s.id as string,
    course: s.course as string,
    publishedAt: (s.ai_package?.package_published_at as string | null | undefined) ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingForClient = upcomingSessions.map((s: any) => ({
    id: s.id,
    course: s.course,
    start_time: s.start_time,
    end_time: s.end_time,
    tutor_name:
      s.tutor?.display_name?.trim() ||
      (typeof s.tutor?.email === "string" && s.tutor.email.includes("@")
        ? s.tutor.email.split("@")[0]
        : "Guide"),
    tutor_avatar_url: s.tutor?.avatar_url ?? null,
  }));

  const weekRange = getWeekRangeUTC(now);

  const firstUpcomingWithGuide = upcomingSessions.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.tutor_id && isGuideMemoryWindowOpen(String(s.start_time), now.getTime()),
  );
  const guideMemoryHub =
    momentumSubscriber && firstUpcomingWithGuide
      ? await loadGuideMemoryForSession({
          studentId: user.id,
          guideId: String(firstUpcomingWithGuide.tutor_id),
          sessionStartTime: String(firstUpcomingWithGuide.start_time),
          guideName:
            firstUpcomingWithGuide.tutor?.display_name?.trim() ||
            (typeof firstUpcomingWithGuide.tutor?.email === "string"
              ? firstUpcomingWithGuide.tutor.email.split("@")[0]
              : "Guide"),
        }).catch(() => null)
      : null;

  const packSprintSuccess =
    query.booking === "pack_success"
      ? await getActivePackSprintState(user.id).catch(() => null)
      : null;
  const daysUntilExam =
    activeGoal?.targetDate != null ? daysUntilDate(activeGoal.targetDate) : null;

  return (
    <div className={mentrixStudent.pageBgHub}>
      <StudentHubRealtimeRefresh userId={user.id} />
      <main className={mentrixStudent.main}>
        <div className={`${mentrixStudent.hubHero} mb-4`}>
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <StudentHeroGreeting greeting={greeting} firstName={firstName} />
              <StudentHeroQuickActions className="sm:pt-1" />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <RankBadge rank={accountRank} size="md" active showGlow={accountRank.key === "mentrixer"} priority />
              <p
                className="text-sm font-bold uppercase tracking-wide sm:text-base"
                style={{ color: accountRank.labelOnLight }}
              >
                {normalizeRankTitle(accountRank.title)}
              </p>
              <XpCountDisplay xp={totalXp} size={22} showLabel accent="indigo" surface="light" />
              {streak > 0 ? (
                <StreakCountDisplay days={streak} size={22} atRisk={streakAtRisk} showLabel accent="violet" surface="light" />
              ) : null}
              {questAccuracy ? (
                <span className="inline-flex items-center gap-2">
                  <MentrixaVocabIcon name={CANONICAL_QUEST_ICON} size={20} surface="light" title="Quest" />
                  <span className="font-mono text-sm font-bold tabular-nums text-[#0891B2]">
                    {questAccuracy.accuracyPercent}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6366F1]">
                    Quest
                  </span>
                </span>
              ) : null}
            </div>

            {verifiedRankStats.verifiedCount > 0 ? (
              <VerifiedRankHeroStrip
                stats={verifiedRankStats}
                nextActionLabel={rankNextAction ?? undefined}
              />
            ) : null}
          </div>
        </div>

        {!activeGoal ? (
          <div className="mt-4">
            <DeferredStudentGoalCaptureCard subject={AP_CALC_AB_SUBJECT} />
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {masteryGrid ? (
            <div className="lg:col-span-7">
              <MasteryGridHubCard data={masteryGrid} compact />
            </div>
          ) : null}
          <div className={masteryGrid ? "flex flex-col gap-4 lg:col-span-5" : "flex flex-col gap-4 lg:col-span-12"}>
            {movementReceipt ? (
              <MovementReceiptHubCard
                data={movementReceipt.receipt_data}
                momentumActive={archiveSubscriber}
                compact
              />
            ) : null}
            <DeferredTopRivalCard rivalData={rivalData} />
          </div>
        </div>

        {(trajectoryIndex || unifiedTrajectory || pendingRetest || loopRows.length > 0 || goalDashboard || impactReceiptsFull.length > 0) ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {trajectoryIndex ? <TrajectoryIndexHubCard data={trajectoryIndex} /> : null}
            {unifiedTrajectory ? <UnifiedTrajectoryHubCard data={unifiedTrajectory} /> : null}
            {pendingRetest ? <RetestCountdownHubCard state={pendingRetest} /> : null}
            {loopRows.length > 0 ? (
              <LoopReportHubCard rows={loopRows} momentumActive={momentumSubscriber} />
            ) : null}
            {goalDashboard ? <GoalDashboardCard data={goalDashboard} /> : null}
            {impactReceiptsFull.length > 0 ? (
              <GuideImpactReceiptCard
                receipts={impactReceiptsFull}
                momentumActive={momentumSubscriber}
              />
            ) : null}
          </div>
        ) : null}

        {progressSnapshot ? (
          <div className="mt-4">
            <DeferredProgressSnapshotCard snapshot={progressSnapshot} momentumSubscriber={momentumSubscriber} />
          </div>
        ) : null}

        {query.booking === "pack_success" ? (
          <PackSprintSuccessPanel packSprint={packSprintSuccess} daysUntilExam={daysUntilExam} />
        ) : null}
        {query.booking === "success" && (
          <div className="mt-8 mb-2 rounded-2xl border border-emerald-400/35 bg-emerald-950/40 px-5 py-4 text-sm text-emerald-100 shadow-sm">
            <p className="font-medium text-emerald-50">Payment received</p>
            <p className="mt-1 text-emerald-100/90">
              {query.reason === "approved"
                ? "You have been accepted by Guide and are being redirected to your upcoming guide calls."
                : "Waiting on your Guide to accept. You are being redirected to your upcoming guide calls."}
            </p>
            <p className="mt-3 text-xs text-emerald-200/80">
              <Link
                href="/student?sessionsTab=upcoming#sessions-history"
                className="font-medium underline hover:text-emerald-50"
              >
                Open upcoming guide calls
              </Link>
            </p>
          </div>
        )}
        {query.booking === "cancelled" && (
          <div className="mt-8 mb-2 rounded-2xl border border-violet-500/30 bg-indigo-950/50 px-5 py-4 text-sm text-violet-100 shadow-sm">
            Checkout was cancelled. No charge was made.
          </div>
        )}
        {query.booking === "error" && query.reason === "slot_unavailable" && (
          <div className="mt-8 mb-2 rounded-2xl border border-amber-400/35 bg-amber-950/35 px-5 py-4 text-sm text-amber-100 shadow-sm">
            <p className="font-medium text-amber-50">That time was booked by another learner first</p>
            <p className="mt-1 text-amber-100/90">
              While you were in checkout, someone else finished paying for this slot. Your payment was refunded
              automatically (typically 5–10 business days). Please choose another open time.
            </p>
          </div>
        )}
        {query.booking === "error" && query.reason !== "slot_unavailable" && (
          <div className="mt-8 mb-2 rounded-2xl border border-red-400/35 bg-red-950/35 px-5 py-4 text-sm text-red-100 shadow-sm">
            Payment succeeded but booking sync failed. Please refresh once or contact support.
            {query.reason ? ` (${query.reason})` : ""}
          </div>
        )}

        {sessionBriefs.length > 0 && (
          <div className="mt-6 space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sessionBriefs.map((brief: any) => (
              <DeferredPreSessionBriefCard key={brief.id} brief={brief} />
            ))}
          </div>
        )}

        {guideMemoryHub ? (
          <div className="mt-8">
            <GuideMemoryPanel data={guideMemoryHub} />
          </div>
        ) : null}

        <div className="mt-6 space-y-6">
          <DeferredStudentCommandCenterClient
            userId={user.id}
            studentCourses={studentCourses}
            upcomingSessions={upcomingForClient}
            availability={availability}
            availableCourses={courses}
            tutorExpertise={tutorExpertise}
            displayTimeZone={timeZone}
            guideImpactByTutorId={guideImpactByTutorId}
            questHistorySubjects={questHistorySubjects}
            guideRankByTutorId={guideRankByTutorId}
            momentumSubscriber={momentumSubscriber}
            sessionCreditAvailable={sessionCreditAvailable}
            packSprintCreditsRemaining={entitlements.packSprint?.creditsRemaining ?? 0}
            monthlyCreditsRemaining={entitlements.monthlyCreditsRemaining}
            rematchBadgesByTutorId={rematchBadgesByTutorId}
          />

          <div id="sessions-history" className="scroll-mt-24 border-t border-[#6366F1]/30 pt-6">
            <DeferredStudentStudyPackageNotifier snapshots={studyPackageSnapshots} />
            <Suspense fallback={<div className={`min-h-[12rem] ${mentrixStudent.hubNotebook}`} />}>
              <DeferredSessionsList
                upcomingSessions={upcomingSessions}
                pastSessions={pastSessions}
                sessionRequests={sessionsBundle.sessionRequests}
                totalXp={totalXp}
                streak={streak}
                displayTimeZone={timeZone}
                weekRange={weekRange}
                showHeroStats={false}
                momentumActive={momentumSubscriber}
                initialOpenStudyPackageId={
                  typeof query.openStudyPackage === "string" ? query.openStudyPackage : ""
                }
                initialSessionsTab={
                  query.booking === "success"
                    ? "upcoming"
                    : query.sessionsTab === "past"
                      ? "past"
                      : query.sessionsTab === "upcoming"
                        ? "upcoming"
                        : undefined
                }
              />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

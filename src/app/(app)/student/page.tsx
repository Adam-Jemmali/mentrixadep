import Link from "next/link";
import { Suspense } from "react";
import { StudentHeroGreeting } from "@/features/student-profile/ui/student-hero-greeting";

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
  formatVerifiedRankVerdict,
  loadVerifiedFirstAttemptRankStats,
} from "@/features/xp/calibrated-rank";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";

import { getWeekRangeUTC } from "@/shared/core/time-format";
import { MentrixHeroDecor } from "@/features/student-profile/ui/mentrix-hero-decor";
import { mentrixStudent, mentrixBrandUi } from "@/features/student-profile/mentrix-student-ui";
import {
  DeferredAccountRankLadder,
  DeferredHeroMentrixerBounce,
  DeferredPreSessionBriefCard,
  DeferredProgressSnapshotCard,
  DeferredSessionsList,
  DeferredStudentCommandCenterClient,
  DeferredStudentGoalCaptureCard,
  DeferredStudentStatStripMotion,
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
import { Button } from "@/shared/ui/button";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
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
  const archiveSubscriber = entitlements.momentumActive || entitlements.alumniActive;
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
  const rankVerdict = formatVerifiedRankVerdict(verifiedRankStats);
  const rankNextAction = formatVerifiedRankNextAction(verifiedRankStats);

  const sessionsCompleted = pastSessions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.completed || s.status === "completed",
  ).length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRatings = pastSessions.flatMap((s: any) => s.ratings ?? []);
  const avgRating =
    allRatings.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? allRatings.reduce((acc: number, r: any) => acc + r.rating, 0) / allRatings.length
      : 0;

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
        <div className={`${mentrixStudent.heroGradientLite} mb-8 p-6 sm:p-8 relative overflow-hidden`}>
          <MentrixHeroDecor />
          <DeferredHeroMentrixerBounce />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-4">
              <div>
                <StudentHeroGreeting greeting={greeting} firstName={firstName} />
                <p className="mt-2 text-sm text-white/90">
                  {rankVerdict}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <RankBadge rank={accountRank} size="lg" active showGlow={accountRank.key === "mentrixer"} priority />
                <div className="min-w-0">
                  <p
                    className="text-lg font-bold uppercase tracking-wide sm:text-xl"
                    style={{ color: accountRank.labelOnDark }}
                  >
                    {normalizeRankTitle(accountRank.title)}
                  </p>
                  <p className="text-xs text-white/85">
                    Account rank · {totalXp.toLocaleString()} XP
                    {streak > 0 ? (
                      <>
                        <span className="text-white/50"> · </span>
                        {streak}d streak
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="max-w-md rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/90">
                <p className="font-medium text-white">{rankNextAction}</p>
              </div>

              {streak > 0 && (
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${streakAtRisk ? "text-amber-100" : "text-white/90"}`}>
                  {streakAtRisk
                    ? "Keep your streak alive !"
                    : `${streak}-day streak active`}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className={`min-h-11 text-xs ${mentrixBrandUi.heroBtnOutline}`} asChild>
                  <Link
                    href={`/student/${user.id}`}
                    className="inline-flex min-h-11 items-center gap-1.5 px-3"
                  >
                    <img
                      src="/icons/mentrixer.svg"
                      alt=""
                      width={14}
                      height={14}
                      className="size-3.5 shrink-0 opacity-80"
                      aria-hidden
                    />
                    Profile & Settings
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className={`min-h-11 text-xs ${mentrixBrandUi.heroBtn}`} asChild>
                  <Link
                    href="/student/quest"
                    className="inline-flex min-h-11 items-center gap-1.5 px-3"
                  >
                    <img src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4 shrink-0" aria-hidden />
                    Daily quest
                  </Link>
                </Button>
                <Button size="sm" className={`min-h-11 text-xs ${mentrixBrandUi.heroBtnOutline}`} asChild>
                  <Link
                    href="#browse-guides"
                    className="inline-flex min-h-11 items-center gap-1.5 px-3"
                  >
                    <img src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4 shrink-0" aria-hidden />
                    Book session
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {!activeGoal ? (
          <div className="mt-6">
            <DeferredStudentGoalCaptureCard subject={AP_CALC_AB_SUBJECT} />
          </div>
        ) : null}

        {masteryGrid ? (
          <div className="mt-8">
            <MasteryGridHubCard data={masteryGrid} />
          </div>
        ) : null}

        {movementReceipt ? (
          <div className="mt-8">
            <MovementReceiptHubCard
              data={movementReceipt.receipt_data}
              momentumActive={archiveSubscriber}
            />
          </div>
        ) : null}

        {trajectoryIndex ? (
          <div className="mt-8">
            <TrajectoryIndexHubCard data={trajectoryIndex} />
          </div>
        ) : null}

        {unifiedTrajectory ? (
          <div className="mt-8">
            <UnifiedTrajectoryHubCard data={unifiedTrajectory} />
          </div>
        ) : null}

        {pendingRetest ? (
          <div className="mt-8">
            <RetestCountdownHubCard state={pendingRetest} />
          </div>
        ) : null}

        {loopRows.length > 0 ? (
          <div className="mt-8">
            <LoopReportHubCard rows={loopRows} momentumActive={momentumSubscriber} />
          </div>
        ) : null}

        {goalDashboard ? (
          <div className="mt-8">
            <GoalDashboardCard data={goalDashboard} />
          </div>
        ) : null}

        {impactReceiptsFull.length > 0 ? (
          <div className="mt-8">
            <GuideImpactReceiptCard
              receipts={impactReceiptsFull}
              momentumActive={momentumSubscriber}
            />
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          {progressSnapshot ? (
            <DeferredProgressSnapshotCard snapshot={progressSnapshot} momentumSubscriber={momentumSubscriber} />
          ) : null}
          <DeferredAccountRankLadder totalXp={totalXp} variant="dashboard" />
          <DeferredStudentStatStripMotion
            totalXp={totalXp}
            streak={streak}
            sessionsCompleted={sessionsCompleted}
            avgRating={avgRating}
            streakAtRisk={streakAtRisk}
            questAccuracy={questAccuracy}
            accountRank={accountRank}
          />
        </div>

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

        <div className="mt-10 space-y-10">
          <DeferredTopRivalCard rivalData={rivalData} />

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

          <div id="sessions-history" className="scroll-mt-24 border-t border-violet-500/25 pt-10">
            <div className={`${mentrixStudent.card} mb-6 px-5 py-4`}>
              <p className={mentrixStudent.sectionEyebrow}>Live coaching</p>
              <h2 className={`mt-1 text-lg font-bold ${mentrixStudent.textOnDark}`}>Sessions</h2>
              <p className={`mt-1 text-sm ${mentrixStudent.textMutedOnDark}`}>
                Upcoming and past guide calls.
              </p>
            </div>
            <DeferredStudentStudyPackageNotifier snapshots={studyPackageSnapshots} />
            <Suspense fallback={<div className={`min-h-[12rem] ${mentrixStudent.card}`} />}>
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

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
import type { StudentCourse, UserXp } from "@/shared/types/database";
import {
  formatVerifiedRankNextAction,
  loadVerifiedFirstAttemptRankStats,
} from "@/features/xp/calibrated-rank";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { RANK_LADDER_CHIP_SIZE } from "@/features/xp/rank-display-tokens";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { XpCountDisplay } from "@/shared/icons/mentrixa-vocab-icons";
import { VfaProofStreakDisplay } from "@/features/vfa-streak/ui/vfa-proof-streak";
import { loadVfaStreakHomeDisplay } from "@/features/vfa-streak/load-vfa-streak";
import { loadVerifiedAttemptProofCards } from "@/features/quest/load-verified-attempt-proof";
import { VerifiedAttemptProofRail } from "@/features/quest/components/verified-attempt-card";
import { getWeekRangeUTC } from "@/shared/core/time-format";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import {
  DeferredPreSessionBriefCard,
  DeferredSessionsList,
  DeferredStudentGoalCaptureCard,
  DeferredStudentCommandCenterClient,
  DeferredStudentStudyPackageNotifier,
  DeferredTopRivalCard,
} from "./student-dashboard-deferred";
import { ProgressSnapshotHubSlot } from "@/features/progress-snapshot/ui/progress-snapshot-hub-slot";
import {
  firstNameFromDisplayName,
  getLocalHour,
  greetingForHour,
} from "@/features/student-profile/student-dashboard-helpers";
import { getUpcomingSessionBriefs } from "@/features/pre-session-brief/brief";
import { StudentHubRealtimeRefresh } from "@/components/student-hub-realtime-refresh";
import {
  getGuideNodeImpactRollingBatch,
  loadWeakestRollingStatNode,
} from "@/features/guide-impact/reads";
import { getGuideRanksMap } from "@/features/guide-rank/reads";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { MasteryGridHubCard } from "@/features/mastery-grid/mastery-grid-hub-card";
import { pickPrimaryWeakestMasteryNode } from "@/features/mastery-grid/mastery-grid-pure";
import { loadActiveStudentGoalForViewer } from "@/features/student-goals/load-student-goal";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { getStudentSubscription } from "@/features/payments/student-subscription";
import { MomentumActiveHubCard } from "@/features/student-profile/ui/momentum-active-hub-card";
import { MomentumMembershipHubCard } from "@/features/student-profile/ui/momentum-membership-hub-card";
import { MomentumMembershipMemberChip } from "@/features/student-profile/ui/momentum-membership-member-chip";
import { loadActiveMovementReceiptForViewer } from "@/features/movement-receipt/load-movement-receipt";
import { MovementReceiptHubCard } from "@/features/movement-receipt/ui/movement-receipt-hub-card";
import { buildBeatLineView } from "@/features/divisions/beat-line-pure";
import { pickStudentHubDoNext } from "@/features/student-profile/student-hub-do-next-pure";
import { StudentHubDoNextCard } from "@/features/student-profile/ui/student-hub-do-next";
import { getGuideRematchBadgesForStudent } from "@/features/matchmaker/load-guide-rematch-badges";
import { getActivePackSprintState } from "@/features/entitlements/session-credits";
import { PackSprintSuccessPanel } from "@/features/entitlements/ui/pack-sprint-success-panel";
import { loadStudentShareNotifications } from "@/features/share-artifacts/student-share-notifications";
import { StudentShareNotifyStrip } from "@/features/share-artifacts/ui/student-share-notify-strip";
import { loadGuidePortfolioOptInNotices } from "@/features/guide-portfolio/actions";
import { GuidePortfolioOptInStrip } from "@/features/guide-portfolio/ui/guide-portfolio-opt-in-strip";
import { daysUntilDate } from "@/features/goal-dashboard/goal-dashboard-pure";

interface StudentPageProps {
  searchParams: Promise<{
    booking?: string;
    reason?: string;
    openStudyPackage?: string;
    sessionsTab?: string;
    guide?: string;
    focus?: string;
    subject?: string;
  }>;
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const query = await searchParams;
  const user = await requireRole(["student", "admin"]);
  const now = new Date();

  const [snapshot, sessionsBundle, sessionBriefs, availability, rivalData, verifiedRankStats, masteryGrid, activeGoal, entitlements, subscription, movementReceipt, vfaStreakDisplay, shareNotices, portfolioNotices, verifiedProof] =
    await Promise.all([
      getStudentHubSnapshot(),
      getStudentSessionsHubBundle(),
      getUpcomingSessionBriefs().catch(() => []),
      getTutorAvailability(),
      getTopRival(),
      loadVerifiedFirstAttemptRankStats(user.id),
      loadMasteryGrid(user.id).catch(() => null),
      loadActiveStudentGoalForViewer(AP_CALC_AB_SUBJECT),
      getStudentEntitlements(user.id),
      getStudentSubscription(user.id),
      loadActiveMovementReceiptForViewer().catch(() => null),
      loadVfaStreakHomeDisplay(user.id).catch(() => ({ kind: "none" as const })),
      loadStudentShareNotifications(1).catch(() => []),
      loadGuidePortfolioOptInNotices(1).catch(() => []),
      loadVerifiedAttemptProofCards(6).catch(() => ({
        cards: [],
        constructionMixLabel: "No verified attempts yet.",
        constructionShare: 0,
      })),
    ]);
  const momentumSubscriber = entitlements.momentumActive;
  const archiveSubscriber = entitlements.momentumActive;
  const sessionCreditAvailable = entitlements.sessionCreditsRemaining > 0;

  const { upcomingSessions, pastSessions } = sessionsBundle;

  const tutorIdsForImpact = Array.from(new Set(availability.map((a) => a.tutor_id)));
  const browsePrefillWeakestNodeFilter = Boolean(query.guide?.trim() || query.focus?.trim());
  const [guideNodeImpactRolling, weakestRollingNode, guideRankByTutorId, rematchBadgesByTutorId] =
    await Promise.all([
      getGuideNodeImpactRollingBatch(tutorIdsForImpact).catch(() => ({
        topChipsByGuideId: {},
        impactByGuideAndNode: {},
        avgImpactByGuideId: {},
      })),
      loadWeakestRollingStatNode(user.id).catch(() => null),
      getGuideRanksMap(tutorIdsForImpact).catch(() => ({})),
      getGuideRematchBadgesForStudent(user.id, tutorIdsForImpact).catch(() => ({})),
    ]);

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

  const accountRank = getAccountRankFromTotalXp(totalXp);
  const rankNextAction = formatVerifiedRankNextAction(verifiedRankStats);

   
  const studyPackageSnapshots = [...pastSessions, ...upcomingSessions].map((s: any) => ({
    sessionId: s.id as string,
    course: s.course as string,
    publishedAt: (s.ai_package?.package_published_at as string | null | undefined) ?? null,
  }));

   
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

  const beatLineView = buildBeatLineView(rivalData);
  const hubDoNext = pickStudentHubDoNext({ beatLine: beatLineView });
  const showBeatLineCard =
    rivalData.status !== "no_division" &&
    !(hubDoNext && beatLineView && hubDoNext.ctaHref === beatLineView.ctaHref);
  const showMovementReceipt = movementReceipt != null && hubDoNext == null;

  const packSprintSuccess =
    query.booking === "pack_success"
      ? await getActivePackSprintState(user.id).catch(() => null)
      : null;
  const daysUntilExam =
    activeGoal?.targetDate != null ? daysUntilDate(activeGoal.targetDate) : null;

  const liveWeakestNode = masteryGrid ? pickPrimaryWeakestMasteryNode(masteryGrid) : null;
  const liveWeakest = liveWeakestNode
    ? {
        label: liveWeakestNode.nodeName,
        accuracyPercent: liveWeakestNode.accuracyPercent ?? 0,
      }
    : null;

  return (
    <div className={mentrixStudent.pageBgHub}>
      <StudentHubRealtimeRefresh userId={user.id} />
      <main className={mentrixStudent.main}>
        <StudentStickyNote variant="pinned" className="mb-4">
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <StudentHeroGreeting greeting={greeting} firstName={firstName} />
              <StudentHeroQuickActions className="sm:pt-1" />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <RankBadge
                rank={accountRank}
                size={RANK_LADDER_CHIP_SIZE}
                active
                surface="light"
                animate={accountRank.key === "mentrixer" || accountRank.key === "apex"}
              />
              <p
                className="text-sm font-bold uppercase tracking-wide sm:text-base"
                style={{ color: accountRank.labelOnLight }}
              >
                {normalizeRankTitle(accountRank.title)}
              </p>
              <XpCountDisplay xp={totalXp} size={22} showLabel accent="indigo" surface="light" />
              <VfaProofStreakDisplay display={vfaStreakDisplay} />
              {momentumSubscriber ? <MomentumMembershipMemberChip /> : null}
            </div>

            {verifiedRankStats.verifiedCount > 0 ? (
              <VerifiedRankHeroStrip
                stats={verifiedRankStats}
                nextActionLabel={rankNextAction ?? undefined}
              />
            ) : null}
          </div>
        </StudentStickyNote>

        <div className="mt-4">
          <VerifiedAttemptProofRail
            cards={verifiedProof.cards}
            mixLabel={verifiedProof.constructionMixLabel}
          />
        </div>

        {momentumSubscriber ? (
          <div className="mt-4">
            <MomentumActiveHubCard
              sessionCreditsRemaining={entitlements.sessionCreditsRemaining}
              sessionCreditPeriodMonth={entitlements.sessionCreditPeriodMonth}
              subscription={subscription}
              momentumCompMember={entitlements.momentumCompMember}
            />
          </div>
        ) : (
          <div className="mt-4">
            <MomentumMembershipHubCard />
          </div>
        )}

        <div className="mt-4">
          <Suspense fallback={null}>
            <ProgressSnapshotHubSlot
              momentumSubscriber={momentumSubscriber}
              liveWeakest={liveWeakest}
            />
          </Suspense>
        </div>

        {!activeGoal ? (
          <div className="mt-4">
            <DeferredStudentGoalCaptureCard subject={AP_CALC_AB_SUBJECT} />
          </div>
        ) : null}

        {shareNotices.length > 0 ? (
          <div className="mt-4">
            <StudentShareNotifyStrip items={shareNotices} />
          </div>
        ) : null}

        {portfolioNotices.length > 0 ? (
          <div className="mt-4">
            <GuidePortfolioOptInStrip items={portfolioNotices} />
          </div>
        ) : null}

        {hubDoNext ? (
          <div className="mt-4">
            <StudentHubDoNextCard action={hubDoNext} />
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
          {masteryGrid ? (
            <div className="flex lg:col-span-7">
              <MasteryGridHubCard data={masteryGrid} compact stickyVariant="curl" />
            </div>
          ) : null}
          <div
            className={
              masteryGrid
                ? "flex flex-col gap-4 lg:col-span-5"
                : "flex flex-col gap-4 lg:col-span-12"
            }
          >
            {showMovementReceipt ? (
              <MovementReceiptHubCard
                data={movementReceipt.receipt_data}
                momentumActive={archiveSubscriber}
                compact
              />
            ) : null}
            {showBeatLineCard ? (
              <DeferredTopRivalCard rivalData={rivalData} className="flex-1" />
            ) : null}
          </div>
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
            { }
            {sessionBriefs.map((brief: any) => (
              <DeferredPreSessionBriefCard key={brief.id} brief={brief} />
            ))}
          </div>
        )}

        <div className="mt-6 space-y-6">
          <DeferredStudentCommandCenterClient
            userId={user.id}
            studentCourses={studentCourses}
            upcomingSessions={upcomingForClient}
            availability={availability}
            availableCourses={courses}
            tutorExpertise={tutorExpertise}
            displayTimeZone={timeZone}
            guideNodeImpactRolling={guideNodeImpactRolling}
            weakestRollingNode={weakestRollingNode}
            prefillWeakestNodeFilter={browsePrefillWeakestNodeFilter}
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { ScrollRevealCard } from "@/shared/ui/card";
import Link from "next/link";
import { SessionsList } from "./sessions-list";
import { SessionRequestsList } from "./session-requests-list";
import { AvailabilityManager } from "./availability-manager";
import { AutoApproveToggle } from "./auto-approve-toggle";
import { CreateAvailabilityCard } from "@/shared/ui/create-availability-card";
import { CourseManager } from "./course-manager";
import { useAdminViewContext } from "@/components/admin-view-context";
import { formatDate } from "@/shared/core/time-format";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { TutorHeroGreeting } from "@/features/tutor/ui/tutor-hero-greeting";
import { Typewriter } from "@/shared/ui/typewriter";
import { MentrixaCountBadge } from "@/shared/ui/badge-patterns";

type AnySession = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status?: string;
  price_per_session?: number | null;
  price?: number | null;
  rating?: number | null;
  hasAiPackage?: boolean;
};

type AnyAvailability = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  price_per_session?: number | null;
  price?: number | null;
  active?: boolean;
  pending_booking_count?: number;
};

export type AnySessionRequest = {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
  availability?: {
    course: string;
    start_time: string;
    end_time: string;
    price_per_session?: number | null;
    price?: number | null;
  };
};

type TutorCourseItem = {
  id: string;
  course_name: string;
  proof_description: string;
  verified: boolean;
};

interface TutorDashboardClientProps {
  availability: AnyAvailability[];
  upcomingSessions: AnySession[];
  pastSessions: AnySession[];
  sessionRequests: AnySessionRequest[];
  autoApprove: boolean;
  tutorCourses?: TutorCourseItem[];
  tutorTimezone?: string;
  tutorId?: string;
  /** Teaching Defaults — fixed length for each opening created here. */
  sessionDefaultDurationMinutes?: number;
  greeting?: string;
  firstName?: string;
}

export function TutorDashboardClient({
  availability,
  upcomingSessions,
  pastSessions,
  sessionRequests,
  autoApprove,
  tutorCourses = [],
  tutorTimezone = "UTC",
  tutorId,
  sessionDefaultDurationMinutes = 60,
  greeting = "Good day",
  firstName = "Guide",
}: TutorDashboardClientProps) {
  const router = useRouter();
  const [slotsCreatedNotice, setSlotsCreatedNotice] = useState(false);
  const { viewingAsUserId } = useAdminViewContext();
  const studioHref = viewingAsUserId
    ? `/tutor/sessions-ai?tutorId=${viewingAsUserId}`
    : "/tutor/sessions-ai";
  const pendingCount = sessionRequests.length;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthSessions = useMemo(
    () =>
      pastSessions.filter((s) => {
        const d = new Date(s.start_time);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }),
    [pastSessions, currentMonth, currentYear],
  );

  const revenueThisMonth = useMemo(() => {
    const totalCents = monthSessions.reduce((sum, s) => {
      const priceCents = s.price_per_session ?? s.price ?? 0;
      return sum + (typeof priceCents === "number" ? priceCents : 0);
    }, 0);
    return totalCents / 100;
  }, [monthSessions]);

  const sessionsTaught = pastSessions.filter(
    (s) => s.completed || s.status === "completed",
  ).length;

  const avgRating = useMemo(() => {
    const rated = pastSessions.filter(
      (s) => typeof s.rating === "number" && !Number.isNaN(s.rating),
    );
    if (!rated.length) return null;
    const total = rated.reduce((sum, s) => sum + (s.rating || 0), 0);
    return total / rated.length;
  }, [pastSessions]);

  const revenueRef = useRef<HTMLDivElement | null>(null);
  const sessionsRef = useRef<HTMLDivElement | null>(null);
  const ratingRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<HTMLDivElement | null>(null);
  const requestsSectionRef = useRef<HTMLDivElement | null>(null);

  useGsapEffect((gsap) => {
    if (revenueRef.current) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: revenueThisMonth,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          if (revenueRef.current) {
            revenueRef.current.textContent = `$${obj.val.toFixed(2)}`;
          }
        },
      });
    }

    if (sessionsRef.current) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: sessionsTaught,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          if (sessionsRef.current) {
            sessionsRef.current.textContent = Math.round(obj.val).toString();
          }
        },
      });
    }

    if (ratingRef.current && avgRating != null) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: avgRating,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          if (ratingRef.current) {
            ratingRef.current.textContent = `${obj.val.toFixed(1)} / 5`;
          }
        },
      });
    } else if (ratingRef.current && avgRating == null) {
      ratingRef.current.textContent = "–";
    }

    if (pendingRef.current) {
      pendingRef.current.textContent = pendingCount.toString();
    }
  }, [revenueThisMonth, sessionsTaught, avgRating, pendingCount]);

  const handleReviewNow = () => {
    if (requestsSectionRef.current) {
      requestsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    router.prefetch("/tutor/sessions-ai");
    router.prefetch("/tutor");
  }, [router]);

  useEffect(() => {
    if (!slotsCreatedNotice) return;
    router.refresh();
    const scrollTimer = window.setTimeout(() => {
      document.getElementById("tutor-availability-slots")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
    const hideTimer = window.setTimeout(() => setSlotsCreatedNotice(false), 5200);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(hideTimer);
    };
  }, [slotsCreatedNotice, router]);

  const recentPackages = useMemo(() => {
    // Best-effort: use most recent past sessions as stand-in
    return pastSessions.slice(0, 3);
  }, [pastSessions]);

  return (
    <>
    {slotsCreatedNotice ? (
      <div
        role="alert"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[200] w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center shadow-lg"
      >
        <p className="text-sm font-semibold text-slate-900">Slots created</p>
        <p className="mt-1 text-xs text-slate-600">
          Taking you to your availability slots…
        </p>
      </div>
    ) : null}
    <main className={mentrixStudent.main}>
      <header className={`${mentrixStudent.heroGradientLite} relative mb-8 overflow-hidden p-6 sm:p-8`}>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <TutorHeroGreeting greeting={greeting} firstName={firstName} />
            <div className="mt-1 text-sm text-white/90 h-[20px]">
              <Typewriter text="Studio Guide Manage Mentrixa" speed={40} waitTime={5000} />
            </div>
            
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-50 shadow-sm backdrop-blur-sm">
                Guide Studio
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:items-end shrink-0">
            <Button size="sm" className="h-9 text-xs bg-white text-slate-900 hover:bg-slate-100">
              Add availability
            </Button>
          </div>
        </div>
      </header>

      {/* Stat bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={mentrixStudent.card + " p-4"}>
          <div className={mentrixStudent.sectionEyebrowOnLight + " mb-1"}>
            Revenue this month
          </div>
          <div
            ref={revenueRef}
            className="text-[24px] font-bold tracking-[-0.03em] text-slate-900"
          >
            ${revenueThisMonth.toFixed(2)}
          </div>
        </div>

        <div className={mentrixStudent.card + " p-4"}>
          <div className={mentrixStudent.sectionEyebrowOnLight + " mb-1"}>
            Sessions taught
          </div>
          <div
            ref={sessionsRef}
            className="text-[24px] font-bold tracking-[-0.03em] text-slate-900"
          >
            {sessionsTaught}
          </div>
        </div>

        <div className={mentrixStudent.card + " p-4"}>
          <div className={mentrixStudent.sectionEyebrowOnLight + " mb-1"}>
            Avg rating
          </div>
          <div
            ref={ratingRef}
            className="text-[24px] font-bold tracking-[-0.03em] text-slate-900"
          >
            {avgRating != null ? `${avgRating.toFixed(1)} / 5` : "–"}
          </div>
        </div>

        <div className={`${mentrixStudent.card} p-4 ${pendingCount > 0 ? "border-red-200 bg-red-50/50" : ""}`}>
          <div className={`${mentrixStudent.sectionEyebrowOnLight} mb-1 ${pendingCount > 0 ? "text-red-600" : ""}`}>
            Pending requests
          </div>
          <div
            ref={pendingRef}
            className={`text-[24px] font-bold tracking-[-0.03em] ${
              pendingCount > 0 ? "text-red-700" : "text-slate-900"
            }`}
          >
            {pendingCount}
          </div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-6 border border-[#FCA5A5] bg-[#FFF5F5] rounded-md px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">
            {pendingCount} session request{pendingCount === 1 ? "" : "s"} awaiting
            response.
          </p>
          <button
            type="button"
            onClick={handleReviewNow}
            className="text-sm text-red-600 font-semibold underline"
          >
            Review now
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Main area */}
        <div className="lg:col-span-8">
          <ScrollRevealCard className={mentrixStudent.card + " min-h-[26rem] p-6"}>
          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="h-auto bg-transparent border-b border-slate-200 rounded-none px-0 mb-4">
              <TabsTrigger
                value="requests"
                className="rounded-none bg-transparent px-0 mr-6 pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent"
              >
                <span className="inline-flex items-center gap-2">
                  Requests
                  <MentrixaCountBadge count={pendingCount} color="danger" variant="soft" />
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="rounded-none bg-transparent px-0 mr-6 pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="rounded-none bg-transparent px-0 pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent"
              >
                Past
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-0" ref={requestsSectionRef}>
              <SessionRequestsList sessionRequests={sessionRequests} displayTimezone={tutorTimezone} />
            </TabsContent>

            <TabsContent value="upcoming" className="mt-0">
              <SessionsList
                upcomingSessions={upcomingSessions}
                pastSessions={pastSessions}
                guideId={tutorId}
                displayTimeZone={tutorTimezone}
              />
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              <SessionsList
                upcomingSessions={[]}
                pastSessions={pastSessions}
                mode="past-only"
              />
            </TabsContent>
          </Tabs>
          </ScrollRevealCard>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <ScrollRevealCard className={mentrixStudent.card + " min-h-[11rem] p-6"}>
            <CourseManager courses={tutorCourses} />
          </ScrollRevealCard>

          <ScrollRevealCard id="tutor-availability-slots" className={`scroll-mt-24 ${mentrixStudent.card} min-h-[18rem] p-6`}>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Availability</h2>

            <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9] mb-4">
              <p className="text-sm text-slate-700 font-medium">Auto-approve bookings</p>
              <AutoApproveToggle initialValue={autoApprove} />
            </div>

            <div className="max-h-48 overflow-y-auto no-scrollbar mb-4">
              <AvailabilityManager availability={availability} displayTimezone={tutorTimezone} />
            </div>

            <div className="mt-6">
              <CreateAvailabilityCard
                tutorCourseNames={tutorCourses.filter((c) => c.verified).map((c) => c.course_name)}
                defaultTimezone={tutorTimezone}
                sessionDefaultDurationMinutes={sessionDefaultDurationMinutes}
                className="border-none shadow-none bg-transparent max-w-full"
                onSlotsCreated={() => setSlotsCreatedNotice(true)}
              />
              {tutorCourses.some((c) => !c.verified) ? (
                <p className="mt-3 text-[11px] text-amber-700">
                  Some subjects are pending admin review and are hidden from availability until verified.
                </p>
              ) : null}
            </div>
          </ScrollRevealCard>

          <ScrollRevealCard className={mentrixStudent.card + " p-6"}>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Recent packages</h3>
            <div className="space-y-1">
              {recentPackages.map((session) => (
                <div
                  key={session.id}
                  className="py-2.5 border-b border-[#F8FAFC] last:border-0 flex items-center justify-between"
                >
                  <p className="text-xs text-slate-500 font-medium">
                    {session.course} · {formatDate(session.start_time)}
                  </p>
                  <Link
                    href={studioHref}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
              {recentPackages.length === 0 && (
                <p className="text-xs text-slate-400 py-2">No Quest packages yet.</p>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full mt-4 h-9 text-xs border-slate-200" asChild>
              <Link href={studioHref}>Open Studio</Link>
            </Button>
          </ScrollRevealCard>
        </aside>
      </div>
    </main>
    </>
  );
}


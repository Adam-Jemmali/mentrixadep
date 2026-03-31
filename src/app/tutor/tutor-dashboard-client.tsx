"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SessionsList } from "./sessions-list";
import { SessionRequestsList } from "./session-requests-list";
import { AvailabilityManager } from "./availability-manager";
import { AutoApproveToggle } from "./auto-approve-toggle";
import { CreateAvailabilityForm } from "./create-availability-form";
import { CourseManager } from "./course-manager";
import { useAdminViewContext } from "@/components/admin-view-context";
import { formatDate } from "@/lib/time-format";
import { TutorDashboardIllustration } from "@/components/illustrations";
import { RefreshRouter } from "@/components/refresh-router";

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
}

export function TutorDashboardClient({
  availability,
  upcomingSessions,
  pastSessions,
  sessionRequests,
  autoApprove,
  tutorCourses = [],
}: TutorDashboardClientProps) {
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

  useEffect(() => {
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

  const recentPackages = useMemo(() => {
    // Best-effort: use most recent past sessions as stand-in
    return pastSessions.slice(0, 3);
  }, [pastSessions]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 relative">
      <RefreshRouter pollMs={45000} />
      <TutorDashboardIllustration />
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-slate-900">
          Studio
        </h1>
        <Button size="sm">Add availability</Button>
      </header>

      {/* Stat bar */}
      <div className="mentrixa-stat-row grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="mentrixa-stat-cell rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.18em] mb-1">
            Revenue this month
          </div>
          <div
            ref={revenueRef}
            className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900"
          >
            ${revenueThisMonth.toFixed(2)}
          </div>
        </div>

        <div className="mentrixa-stat-cell rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.18em] mb-1">
            Sessions taught
          </div>
          <div
            ref={sessionsRef}
            className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900"
          >
            {sessionsTaught}
          </div>
        </div>

        <div className="mentrixa-stat-cell rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.18em] mb-1">
            Avg rating
          </div>
          <div
            ref={ratingRef}
            className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900"
          >
            {avgRating != null ? `${avgRating.toFixed(1)} / 5` : "–"}
          </div>
        </div>

        <div className="mentrixa-stat-cell rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.18em] mb-1">
            Pending requests
          </div>
          <div
            ref={pendingRef}
            className={`text-[24px] font-semibold tracking-[-0.03em] ${
              pendingCount > 0 ? "text-[#B91C1C]" : "text-slate-900"
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
          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="h-auto bg-transparent border-b border-slate-200 rounded-none px-0 mb-4">
              <TabsTrigger
                value="requests"
                className="rounded-none bg-transparent px-0 mr-6 pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent"
              >
                Requests ({pendingCount})
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
              <SessionRequestsList sessionRequests={sessionRequests} />
            </TabsContent>

            <TabsContent value="upcoming" className="mt-0">
              <SessionsList upcomingSessions={upcomingSessions} pastSessions={pastSessions} />
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              <SessionsList
                upcomingSessions={[]}
                pastSessions={pastSessions}
                mode="past-only"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <section className="mb-4">
            <CourseManager courses={tutorCourses} />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Availability</h2>

            <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9] mb-4">
              <p className="text-sm text-slate-700">Auto-approve bookings</p>
              <AutoApproveToggle initialValue={autoApprove} />
            </div>

            <div className="max-h-48 overflow-y-auto no-scrollbar">
              <AvailabilityManager availability={availability} />
            </div>

            <CreateAvailabilityForm tutorCourseNames={tutorCourses.map((c) => c.course_name)} />
          </section>

          <section className="border-t border-[#E2E8F0] pt-4 mt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Recent packages</h3>
            <div>
              {recentPackages.map((session) => (
                <div
                  key={session.id}
                  className="py-2.5 border-b border-[#F8FAFC] flex items-center justify-between"
                >
                  <p className="text-sm text-slate-500">
                    {session.course} · {formatDate(session.start_time)}
                  </p>
                  <a
                    href={studioHref}
                    className="text-xs text-mentrixa-600 hover:underline"
                  >
                    View
                  </a>
                </div>
              ))}
              {recentPackages.length === 0 && (
                <p className="text-xs text-slate-400">No AI packages yet.</p>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full mt-3" asChild>
              <Link href={studioHref}>Open Studio</Link>
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}


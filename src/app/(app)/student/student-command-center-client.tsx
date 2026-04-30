"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollRevealCard } from "@/components/ui/card";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { formatDateInZone, formatTimeInZone } from "@/lib/time-format";
import { AvailabilityBrowser } from "./availability-browser";
import { StudentCourseChips, type StudentCourseChip } from "./student-course-chips";
import type { LeaderboardEntry } from "@/app/actions/quest";
import { User } from "lucide-react";

type Upcoming = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  tutor_email_prefix: string;
};

type TutorExpertiseEntry = { course_name: string; proof_description: string; verified: boolean };

type RecommendedGuide = {
  tutorId: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  coursesMatched: number;
  hasOpenSlot: boolean;
};

type Availability = {
  id: string;
  tutor_id: string;
  course: string;
  start_time: string;
  end_time: string;
  price_per_session?: number | null;
  tutor?: { id: string; role: string; approved: boolean; email?: string };
};

export function StudentCommandCenterClient({
  studentCourses,
  upcomingSessions,
  availability,
  availableCourses,
  tutorExpertise,
  divisionName,
  myRank,
  leaderboardTop,
  recommendedGuides,
  displayTimeZone = "UTC",
}: {
  studentCourses: StudentCourseChip[];
  upcomingSessions: Upcoming[];
  availability: Availability[];
  availableCourses: string[];
  tutorExpertise: Record<string, TutorExpertiseEntry[]>;
  divisionName: string;
  myRank: number | null;
  leaderboardTop: LeaderboardEntry[];
  recommendedGuides: RecommendedGuide[];
  /** Profile timezone. Slots display in this zone. */
  displayTimeZone?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const normalizedInitial = (searchParams.get("subject") ?? "").trim().toLowerCase();
  const initialSelection = studentCourses.some(
    (c) => c.course_name.trim().toLowerCase() === normalizedInitial,
  )
    ? studentCourses.find((c) => c.course_name.trim().toLowerCase() === normalizedInitial)
        ?.course_name ?? "all"
    : "all";
  const [selectedCourse, setSelectedCourse] = useState<string | "all">(initialSelection);

  // ELITE REALTIME SYNC: Listen for availability changes and refresh the dashboard instantly
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel("availability-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability",
        },
        () => {
          // Revalidate the server-side data without a full page reload
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filteredUpcoming = useMemo(() => {
    if (selectedCourse === "all") return upcomingSessions;
    const t = selectedCourse.toLowerCase().trim();
    return upcomingSessions.filter((s) => s.course.toLowerCase().trim() === t);
  }, [upcomingSessions, selectedCourse]);

  const syncFilter = selectedCourse === "all" ? "all" : selectedCourse;

  return (
    <div className="space-y-8">
      <StudentCourseChips
        courses={studentCourses}
        selectedCourse={selectedCourse}
        onSelectCourse={setSelectedCourse}
      />



     

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <ScrollRevealCard className={`${mentrixStudent.card} p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Today</p>
              <h2 className="text-base font-bold text-slate-900">Upcoming sessions</h2>
            </div>
            <Link
              href="#sessions-history"
              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Full history
            </Link>
          </div>
          {filteredUpcoming.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
              <p className="text-sm text-slate-600">
                No upcoming sessions
                {selectedCourse !== "all" ? ` for ${selectedCourse}` : ""}.
              </p>
              <Button
                asChild
                size="sm"
                className="mt-5 h-8 text-xs"
              >
                <a href="#browse-guides">Browse guides</a>
              </Button>
            </div>
          ) : (
            <div className={`overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/50`}>
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200/80 bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Guide</th>
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="w-[1%] whitespace-nowrap px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcoming.slice(0, 8).map((s) => (
                    <tr key={s.id} className="border-t border-slate-100/90 first:border-t-0 bg-white/80">
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.course}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 opacity-50" />
                          <span>{s.tutor_email_prefix}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 tabular-nums">
                        {formatDateInZone(s.start_time, displayTimeZone)} ·{" "}
                        {formatTimeInZone(s.start_time, displayTimeZone)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/video/session/${s.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Join
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollRevealCard>

        <div className="space-y-6">
          <ScrollRevealCard className={`${mentrixStudent.card} p-5`}>
            <div className="mb-3 flex items-center gap-2 text-slate-800">
              <Image src="/images/xp.png" alt="Rank" width={16} height={16} />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Rank snapshot</span>
            </div>
            <p className="mb-1 truncate text-xs font-medium text-slate-500" title={divisionName}>
              {divisionName}
            </p>
            {myRank != null ? (
              <p className="mb-4 text-3xl font-semibold tabular-nums text-slate-900">
                #{myRank}
                <span className="ml-2 text-sm font-semibold text-slate-500">your rank</span>
              </p>
            ) : (
              <p className="mb-4 text-sm text-slate-600">
                Earn XP in this division to appear on the board.
              </p>
            )}
            <ul className="space-y-1.5 text-sm">
              {leaderboardTop.slice(0, 3).map((row) => (
                <li
                  key={row.userId}
                  className={`flex justify-between gap-2 rounded-xl px-3 py-2 ${
                    row.isCurrentUser ? "border border-indigo-200 bg-indigo-50/80" : "bg-slate-50/90"
                  }`}
                >
                  <span className="text-slate-800">
                    <span className="mr-2 font-mono text-xs font-bold text-slate-400">#{row.rank}</span>
                    {row.displayName}
                  </span>
                  <span className="tabular-nums font-semibold text-slate-600">{row.divisionXp} XP</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2">
              <Link href="/student/division" className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50">Open full leaderboard</Link>
              <Link href="/student/duel" className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50">Enter duel queue</Link>
            </div>
          </ScrollRevealCard>

          <ScrollRevealCard className={`${mentrixStudent.card} p-5`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Quick actions</p>
            <div className="mt-3 space-y-2">
              <Link href="/student/quest" className="flex min-h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                <span className="inline-flex items-center gap-2"><Image src="/images/quest.png" alt="Quest" width={16} height={16} /> Start daily quest</span>
                <Image src="/images/live.png" alt="Open" width={16} height={16} className="opacity-60" />
              </Link>
              <Link href="/student/duel" className="flex min-h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                <span className="inline-flex items-center gap-2"><Image src="/images/sword.png" alt="Duel" width={16} height={16} /> Find duel</span>
                <Image src="/images/live.png" alt="Open" width={16} height={16} className="opacity-60" />
              </Link>
              <a href="#browse-guides" className="flex min-h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                <span className="inline-flex items-center gap-2"><Image src="/images/book.png" alt="Book" width={16} height={16} /> Book a guide</span>
                <Image src="/images/live.png" alt="Open" width={16} height={16} className="opacity-60" />
              </a>
            </div>
          </ScrollRevealCard>
        </div>
      </div>

      {recommendedGuides.length > 0 && (
        <ScrollRevealCard className={`${mentrixStudent.card} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Recommended guides</h2>
            <User className="w-4 h-4 opacity-50" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recommendedGuides.map((g) => (
              <div
                key={g.tutorId}
                className="rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {g.avatarUrl ? (
                      <Image src={g.avatarUrl} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-slate-600">
                        {g.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold text-slate-900">{g.displayName}</p>
                </div>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-slate-600">
                  {g.bio?.trim() || "Experienced guide with strong match against your selected subjects."}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {g.coursesMatched} course{g.coursesMatched === 1 ? "" : "s"} matched
                </p>
                {g.hasOpenSlot && (
                  <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                    Open slots
                  </span>
                )}
                <a href="#browse-guides" className="mt-3 inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                  Book now
                </a>
              </div>
            ))}
          </div>
        </ScrollRevealCard>
      )}

      <section id="browse-guides" className="scroll-mt-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Guides</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Browse & book</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Prove what you know everywhere you can
        </p>
        <p className="mt-1 mb-4 text-sm text-slate-600">Pick a Guide, lock a slot, show up ready to level up.</p>
        <AvailabilityBrowser
          availability={availability}
          courses={availableCourses}
          studentCourseNames={studentCourses.map((c) => c.course_name)}
          tutorExpertise={tutorExpertise}
          syncCourseFilter={syncFilter}
          displayTimeZone={displayTimeZone}
        />
      </section>
    </div>
  );
}

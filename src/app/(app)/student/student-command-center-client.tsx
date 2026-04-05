"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/time-format";
import { AvailabilityBrowser } from "./availability-browser";
import { StudentCourseChips, type StudentCourseChip } from "./student-course-chips";
import type { LeaderboardEntry } from "@/app/actions/quest";

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
}) {
  const searchParams = useSearchParams();
  const normalizedInitial = (searchParams.get("subject") ?? "").trim().toLowerCase();
  const initialSelection = studentCourses.some(
    (c) => c.course_name.trim().toLowerCase() === normalizedInitial,
  )
    ? studentCourses.find((c) => c.course_name.trim().toLowerCase() === normalizedInitial)
        ?.course_name ?? "all"
    : "all";
  const [selectedCourse, setSelectedCourse] = useState<string | "all">(initialSelection);

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

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.section
          className="lg:col-span-2 rounded-md border border-slate-200 bg-white p-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-900">Upcoming sessions</h2>
            <Link
              href="#sessions-history"
              className="text-xs font-medium text-slate-600 underline-offset-4 hover:underline"
            >
              Full history
            </Link>
          </div>
          {filteredUpcoming.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
              <p className="text-sm text-slate-600">
                No upcoming sessions
                {selectedCourse !== "all" ? ` for ${selectedCourse}` : ""}.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-4 border-slate-300">
                <a href="#browse-guides">Browse guides</a>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Course</th>
                    <th className="px-3 py-2 font-medium">Guide</th>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="w-[1%] whitespace-nowrap px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcoming.slice(0, 8).map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 first:border-t-0">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{s.course}</td>
                      <td className="px-3 py-2.5 text-slate-700">{s.tutor_email_prefix}</td>
                      <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                        {formatDate(s.start_time)} · {formatTime(s.start_time)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/video/session/${s.id}`}
                          className="text-xs font-medium text-slate-900 underline-offset-4 hover:underline"
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
        </motion.section>

        <div className="space-y-6">
          <motion.section
            className="rounded-md border border-slate-200 bg-white p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <BookOpen className="h-4 w-4 text-slate-500" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Quests
              </span>
            </div>
            <p className="mb-3 text-sm text-slate-600">Open a quest to keep your momentum.</p>
            <Button asChild size="sm" variant="outline" className="border-slate-300">
              <Link href="/student/quest">Open quest</Link>
            </Button>
          </motion.section>

          <motion.section
            className="rounded-md border border-slate-200 bg-white p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <div className="mb-3 flex items-center gap-2 text-slate-700">
              <Trophy className="h-4 w-4 text-slate-500" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Division leaderboard
              </span>
            </div>
            <p className="mb-1 truncate text-xs text-slate-500" title={divisionName}>
              {divisionName}
            </p>
            {myRank != null ? (
              <p className="mb-4 text-2xl font-medium text-slate-900">
                Your rank <span className="tabular-nums">#{myRank}</span>
              </p>
            ) : (
              <p className="mb-4 text-sm text-slate-600">
                Earn XP in this division to appear on the board.
              </p>
            )}
            <ul className="space-y-1 text-sm">
              {leaderboardTop.slice(0, 3).map((row) => (
                <li
                  key={row.userId}
                  className={`flex justify-between gap-2 rounded-md px-2 py-1.5 ${
                    row.isCurrentUser ? "bg-slate-100" : "bg-transparent"
                  }`}
                >
                  <span className="text-slate-700">
                    <span className="mr-2 font-mono text-xs text-slate-400">{row.rank}</span>
                    {row.displayName}
                  </span>
                  <span className="tabular-nums text-slate-600">{row.divisionXp} XP</span>
                </li>
              ))}
            </ul>
            <Link
              href="/student/division"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-slate-700 underline-offset-4 hover:underline"
            >
              Full leaderboard <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.section>
        </div>
      </div>

      {recommendedGuides.length > 0 && (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-medium text-slate-900">Recommended for you</h2>
          <p className="mt-1 text-xs text-slate-500">Based on courses you follow.</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {recommendedGuides.map((g) => (
              <div
                key={g.tutorId}
                className="min-w-[160px] shrink-0 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-white"
              >
                <p className="truncate font-medium text-slate-900">{g.displayName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {g.coursesMatched} course{g.coursesMatched === 1 ? "" : "s"} matched
                </p>
                {g.hasOpenSlot && (
                  <span className="mt-2 inline-block text-[11px] font-medium text-slate-600">
                    Has open slots
                  </span>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href="#browse-guides"
                    className="text-xs font-medium text-slate-900 underline-offset-4 hover:underline"
                  >
                    Book now
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="browse-guides" className="scroll-mt-24">
        <h2 className="mb-4 text-sm font-medium text-slate-900">Browse guides</h2>
        <AvailabilityBrowser
          availability={availability}
          courses={availableCourses}
          studentCourseNames={studentCourses.map((c) => c.course_name)}
          tutorExpertise={tutorExpertise}
          syncCourseFilter={syncFilter}
        />
      </section>
    </div>
  );
}

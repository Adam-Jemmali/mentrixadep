"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollRevealCard } from "@/components/ui/card";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { formatDateInZone, formatTimeInZone } from "@/lib/time-format";
import { AvailabilityBrowser } from "./availability-browser";
import { StudentCourseChips, type StudentCourseChip } from "./student-course-chips";
import { User } from "lucide-react";

type Upcoming = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  tutor_name: string;
  tutor_avatar_url: string | null;
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
  recommendedGuides,
  displayTimeZone = "UTC",
}: {
  studentCourses: StudentCourseChip[];
  upcomingSessions: Upcoming[];
  availability: Availability[];
  availableCourses: string[];
  tutorExpertise: Record<string, TutorExpertiseEntry[]>;
  recommendedGuides: RecommendedGuide[];
  /** Profile timezone. Slots display in this zone. */
  displayTimeZone?: string;
}) {
  const router = useRouter();
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

  useEffect(() => {
    router.prefetch("/student/quest");
    router.prefetch("/student/duel");
    router.prefetch("/student/division");
    router.prefetch("/student/learning-path");
    router.prefetch("/student/progress");
    router.prefetch("/student/onboarding");
  }, [router]);

  return (
    <div className="space-y-8">
      <StudentCourseChips
        courses={studentCourses}
        selectedCourse={selectedCourse}
        onSelectCourse={setSelectedCourse}
      />



     

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <ScrollRevealCard className={`${mentrixStudent.card} min-h-[22rem] p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Today</p>
              <h2 className="text-base font-bold text-zinc-900">Upcoming sessions</h2>
            </div>
            <Link
              href="#sessions-history"
              className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Full history
            </Link>
          </div>
          {filteredUpcoming.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-12 text-center">
              <p className="text-sm text-zinc-600">
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
            <div className={`overflow-x-auto rounded-2xl border border-zinc-100 bg-zinc-50/50`}>
              <table className="min-w-full text-sm">
                <thead className="border-b border-zinc-200/80 bg-white text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Guide</th>
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="w-[1%] whitespace-nowrap px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcoming.slice(0, 8).map((s) => (
                    <tr key={s.id} className="border-t border-zinc-100/90 first:border-t-0 bg-white/80">
                      <td className="px-4 py-3 font-semibold text-zinc-900">{s.course}</td>
                      <td className="px-4 py-3 text-zinc-700">
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 shrink-0">
                            {s.tutor_avatar_url ? (
                              <Image
                                src={s.tutor_avatar_url}
                                alt={s.tutor_name}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-zinc-600">
                                {s.tutor_name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span>{s.tutor_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 tabular-nums">
                        {formatDateInZone(s.start_time, displayTimeZone)} ·{" "}
                        {formatTimeInZone(s.start_time, displayTimeZone)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/video/session/${s.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
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
          <ScrollRevealCard className={`${mentrixStudent.card} min-h-[11rem] p-5`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Quick actions</p>
            <div className="mt-3 space-y-2">
              <Link href="/student/onboarding" className="flex min-h-11 items-center justify-between rounded-md border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-medium text-indigo-900 transition hover:bg-indigo-50">
                <span className="inline-flex items-center gap-2"><Image src="/images/book.webp" alt="" width={16} height={16} aria-hidden /> Study plan quiz</span>
                <Image src="/images/live.webp" alt="" width={16} height={16} className="size-4 opacity-60" aria-hidden />
              </Link>
              <Link href="/student/progress" className="flex min-h-11 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50">
                <span className="inline-flex items-center gap-2"><Image src="/images/quest.webp" alt="" width={16} height={16} aria-hidden /> View progress</span>
                <Image src="/images/live.webp" alt="" width={16} height={16} className="size-4 opacity-60" aria-hidden />
              </Link>
              <Link href="/student/quest" className="flex min-h-11 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50">
                <span className="inline-flex items-center gap-2"><Image src="/images/quest.webp" alt="" width={16} height={16} aria-hidden /> Start daily quest</span>
                <Image src="/images/live.webp" alt="" width={16} height={16} className="size-4 opacity-60" aria-hidden />
              </Link>
              <Link href="/student/duel" className="flex min-h-11 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50">
                <span className="inline-flex items-center gap-2"><Image src="/images/sword.webp" alt="" width={16} height={16} aria-hidden /> Find duel</span>
                <Image src="/images/live.webp" alt="" width={16} height={16} className="size-4 opacity-60" aria-hidden />
              </Link>
              <a href="#browse-guides" className="flex min-h-11 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50">
                <span className="inline-flex items-center gap-2"><Image src="/images/book.webp" alt="" width={16} height={16} aria-hidden /> Book a guide</span>
                <Image src="/images/live.webp" alt="" width={16} height={16} className="size-4 opacity-60" aria-hidden />
              </a>
            </div>
          </ScrollRevealCard>
        </div>
      </div>

      {recommendedGuides.length > 0 && (
        <ScrollRevealCard className={`${mentrixStudent.card} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-zinc-900">Recommended guides</h2>
            <User className="w-4 h-4 opacity-50" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recommendedGuides.map((g) => (
              <div
                key={g.tutorId}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-4 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                    {g.avatarUrl ? (
                      <Image src={g.avatarUrl} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-zinc-600">
                        {g.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold text-zinc-900">{g.displayName}</p>
                </div>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-zinc-600">
                  {g.bio?.trim() || "Experienced guide with strong match against your selected subjects."}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {g.coursesMatched} course{g.coursesMatched === 1 ? "" : "s"} matched
                </p>
                {g.hasOpenSlot && (
                  <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                    Open slots
                  </span>
                )}
                <a href="#browse-guides" className="mt-3 inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50">
                  Book now
                </a>
              </div>
            ))}
          </div>
        </ScrollRevealCard>
      )}

      <section id="browse-guides" className="scroll-mt-24">
        <p className={mentrixStudent.sectionEyebrow}>Guides</p>
        <h2 className={`mt-1 text-lg font-bold ${mentrixStudent.textOnDark}`}>Browse & book</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
          Prove what you know everywhere you can
        </p>
        <p className={`mt-1 mb-4 text-sm ${mentrixStudent.textMutedOnDark}`}>
          Pick a Guide, lock a slot, show up ready to level up.
        </p>
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

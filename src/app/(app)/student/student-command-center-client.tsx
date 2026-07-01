"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { ScrollRevealCard } from "@/shared/ui/card";
import { mentrixStudent, mentrixProfileType, mentrixBrandUi } from "@/features/student-profile/mentrix-student-ui";
import { formatDateInZone, formatTimeInZone } from "@/shared/core/time-format";
import { AvailabilityBrowser } from "./availability-browser";
import { StudentSubjectFocus } from "./student-subject-focus";
import {
  defaultShippedSubjectName,
  isSingleShippedSubject,
} from "@/features/quest/shipped-subjects";
import type { GuideImpactEntry } from "@/features/guide-impact/impact-score-pure";
import {
  formatMatchedSkillsLine,
  type MatchmakerGuideResult,
} from "@/features/matchmaker/matchmaker-pure";
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
  userId,
  studentCourses,
  upcomingSessions,
  availability,
  availableCourses,
  tutorExpertise,
  displayTimeZone = "UTC",
  guideImpactByTutorId = {},
  questHistorySubjects = [],
  guideRankByTutorId = {},
}: {
  userId: string;
  studentCourses: { id: string; course_name: string }[];
  upcomingSessions: Upcoming[];
  availability: Availability[];
  availableCourses: string[];
  tutorExpertise: Record<string, TutorExpertiseEntry[]>;
  /** Profile timezone. Slots display in this zone. */
  displayTimeZone?: string;
  guideImpactByTutorId?: Record<string, GuideImpactEntry[]>;
  questHistorySubjects?: string[];
  guideRankByTutorId?: Record<string, string>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const singleSubject = isSingleShippedSubject();
  const lockedSubject = defaultShippedSubjectName();
  const normalizedInitial = (searchParams.get("subject") ?? "").trim().toLowerCase();
  const initialSelection = singleSubject
    ? lockedSubject
    : studentCourses.some((c) => c.course_name.trim().toLowerCase() === normalizedInitial)
      ? studentCourses.find((c) => c.course_name.trim().toLowerCase() === normalizedInitial)
          ?.course_name ?? "all"
      : "all";
  const [selectedCourse, setSelectedCourse] = useState<string | "all">(initialSelection);
  const [matchmakerGuides, setMatchmakerGuides] = useState<MatchmakerGuideResult[]>([]);

  const filteredUpcoming = useMemo(() => {
    if (selectedCourse === "all") return upcomingSessions;
    const t = selectedCourse.toLowerCase().trim();
    return upcomingSessions.filter((s) => s.course.toLowerCase().trim() === t);
  }, [upcomingSessions, selectedCourse]);

  const syncFilter = singleSubject
    ? lockedSubject
    : selectedCourse === "all"
      ? "all"
      : selectedCourse;

  useEffect(() => {
    router.prefetch("/student/quest");
    router.prefetch("/student/duel");
    router.prefetch("/student/division");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/matchmaker?userId=${encodeURIComponent(userId)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { guides?: MatchmakerGuideResult[] };
        if (!cancelled && Array.isArray(data.guides)) {
          setMatchmakerGuides(data.guides);
        }
      } catch {
        if (!cancelled) setMatchmakerGuides([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="space-y-8">
      <StudentSubjectFocus
        courses={studentCourses}
        selectedCourse={selectedCourse}
        onSelectCourse={setSelectedCourse}
      />



     

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <ScrollRevealCard className={`${mentrixStudent.card} min-h-[22rem] p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className={mentrixProfileType.labelOnDark}>Today</p>
              <h2 className={mentrixProfileType.cardTitleOnDark}>Upcoming sessions</h2>
            </div>
            <Link href="#sessions-history" className={mentrixBrandUi.ghostBtn}>
              Full history
            </Link>
          </div>
          {filteredUpcoming.length === 0 ? (
            <div className={mentrixBrandUi.emptyState}>
              <p className="text-sm text-violet-200/90">
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
            <div className={mentrixBrandUi.tableShell}>
              <table className="min-w-full text-sm">
                <thead className={mentrixBrandUi.tableHead}>
                  <tr>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Guide</th>
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="w-[1%] whitespace-nowrap px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcoming.slice(0, 8).map((s) => (
                    <tr key={s.id} className={mentrixBrandUi.tableRow}>
                      <td className="px-4 py-3 font-semibold text-violet-50">{s.course}</td>
                      <td className="px-4 py-3 text-violet-100">
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6 overflow-hidden rounded-full border border-violet-500/35 bg-indigo-950/60 shrink-0">
                            {s.tutor_avatar_url ? (
                              <Image
                                src={s.tutor_avatar_url}
                                alt={s.tutor_name}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-violet-200">
                                {s.tutor_name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span>{s.tutor_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-violet-200/80 tabular-nums">
                        {formatDateInZone(s.start_time, displayTimeZone)} ·{" "}
                        {formatTimeInZone(s.start_time, displayTimeZone)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/video/session/${s.id}`} className={mentrixBrandUi.ghostBtn}>
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
            <p className={mentrixProfileType.labelOnDark}>Quick actions</p>
            <div className="mt-3 space-y-2">
              <Link
                href="/student/quest"
                className="flex min-h-11 items-center justify-between rounded-xl border border-violet-400/50 bg-gradient-to-r from-[#7C3AED]/80 to-[#6366F1]/80 px-3 py-2 text-xs font-black uppercase italic tracking-widest text-white transition hover:brightness-110"
              >
                <span className="inline-flex items-center gap-2"><Image src="/images/quest.webp" alt="" width={16} height={16} aria-hidden /> Start daily quest</span>
                <Image src="/images/live.webp" alt="" width={16} height={16} className="size-4 opacity-60" aria-hidden />
              </Link>
              <Link href="/student/duel" className="flex min-h-11 items-center justify-between rounded-xl border border-indigo-500/35 bg-indigo-950/50 px-3 py-2 text-xs font-black uppercase italic tracking-widest text-violet-100 transition hover:border-violet-400/45 hover:bg-violet-900/40">
                <span className="inline-flex items-center gap-2"><Image src="/images/sword.webp" alt="" width={16} height={16} aria-hidden /> Find duel</span>
                <Image src="/images/live.webp" alt="" width={16} height={16} className="size-4 opacity-60" aria-hidden />
              </Link>
              <a href="#browse-guides" className="flex min-h-11 items-center justify-between rounded-xl border border-indigo-500/35 bg-indigo-950/50 px-3 py-2 text-xs font-black uppercase italic tracking-widest text-violet-100 transition hover:border-violet-400/45 hover:bg-violet-900/40">
                <span className="inline-flex items-center gap-2"><Image src="/images/book.webp" alt="" width={16} height={16} aria-hidden /> Book a guide</span>
                <Image src="/images/live.webp" alt="" width={16} height={16} className="size-4 opacity-60" aria-hidden />
              </a>
            </div>
          </ScrollRevealCard>
        </div>
      </div>

      {matchmakerGuides.length > 0 && (
        <ScrollRevealCard className={`${mentrixStudent.card} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={mentrixProfileType.cardTitleOnDark}>Recommended guides</h2>
            <User className="w-4 h-4 opacity-50" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {matchmakerGuides.map((g) => {
              const matchLine = formatMatchedSkillsLine(g.matchedNodes.length);
              return (
              <div
                key={g.guideId}
                className="rounded-xl border border-indigo-500/30 bg-indigo-950/45 px-4 py-4 transition hover:border-violet-400/45 hover:bg-violet-950/50"
              >
                <div className="flex items-center gap-2">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border border-violet-500/35 bg-indigo-950/60">
                    {g.avatarUrl ? (
                      <Image src={g.avatarUrl} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-violet-200">
                        {g.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold text-violet-50">{g.displayName}</p>
                </div>
                {matchLine ? (
                  <p className="mt-2 text-sm text-violet-200/85">{matchLine}</p>
                ) : null}
                {g.matchedNodes.length > 0 && (
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-violet-200/70">
                    {g.matchedNodes.join(", ")}
                  </p>
                )}
                {g.nextAvailableSlot && (
                  <span className="mt-2 inline-block rounded-full border border-indigo-400/40 bg-indigo-950/60 px-2 py-0.5 text-[11px] font-bold text-indigo-200">
                    Open slots
                  </span>
                )}
                <a href="#browse-guides" className={`mt-3 ${mentrixBrandUi.ghostBtn}`}>
                  Book now
                </a>
              </div>
            );
            })}
          </div>
        </ScrollRevealCard>
      )}

      <section id="browse-guides" className="scroll-mt-24">

        <h2 className={`mt-1 ${mentrixProfileType.sectionTitleOnDark}`}>Browse & book</h2>
        <p className={`mt-1 ${mentrixProfileType.labelOnDark}`}>
          Prove what you know everywhere you can
        </p>
       
        <AvailabilityBrowser
          availability={availability}
          courses={availableCourses}
          studentCourseNames={studentCourses.map((c) => c.course_name)}
          tutorExpertise={tutorExpertise}
          syncCourseFilter={syncFilter}
          displayTimeZone={displayTimeZone}
          guideImpactByTutorId={guideImpactByTutorId}
          questHistorySubjects={questHistorySubjects}
          guideRankByTutorId={guideRankByTutorId}
        />
      </section>
    </div>
  );
}

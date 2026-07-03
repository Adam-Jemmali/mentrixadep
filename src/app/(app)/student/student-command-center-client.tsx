"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollRevealCard } from "@/shared/ui/card";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
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
  momentumSubscriber = false,
  sessionCreditAvailable = false,
  packSprintCreditsRemaining = 0,
  monthlyCreditsRemaining = 0,
  rematchBadgesByTutorId = {},
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
  momentumSubscriber?: boolean;
  sessionCreditAvailable?: boolean;
  packSprintCreditsRemaining?: number;
  monthlyCreditsRemaining?: number;
  rematchBadgesByTutorId?: Record<string, { label: string }>;
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
    <div className="space-y-6">
      {!singleSubject ? (
        <StudentSubjectFocus
          courses={studentCourses}
          selectedCourse={selectedCourse}
          onSelectCourse={setSelectedCourse}
        />
      ) : null}

      <ScrollRevealCard className={`${mentrixStudent.hubNotebook} min-h-[16rem]`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className={mentrixHubSurfaces.inkLabel}>Today</p>
              <h2 className={mentrixHubSurfaces.inkTitle}>Upcoming sessions</h2>
            </div>
            <Link href="#sessions-history" className={mentrixStudent.hubGhostLink}>
              Full history
            </Link>
          </div>
          {filteredUpcoming.length === 0 ? (
            <div className={mentrixStudent.hubEmpty}>
              <p className={mentrixHubSurfaces.inkBody}>
                No upcoming sessions
                {selectedCourse !== "all" ? ` for ${selectedCourse}` : ""}.
              </p>
              <a href="#browse-guides" className={`mt-5 ${mentrixStudent.hubBtnSolid}`}>
                Browse guides
              </a>
            </div>
          ) : (
            <div className={mentrixStudent.hubTableShell}>
              <table className="min-w-full">
                <thead className={mentrixStudent.hubTableHead}>
                  <tr>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Guide</th>
                    <th className="px-4 py-3">When</th>
                    <th className="w-[1%] whitespace-nowrap px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcoming.slice(0, 8).map((s) => (
                    <tr key={s.id} className={mentrixStudent.hubTableRow}>
                      <td className="px-4 py-3 font-semibold text-[#0B1220]">{s.course}</td>
                      <td className="px-4 py-3 text-[#334155]">
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6 overflow-hidden rounded-full border border-[#6366F1] bg-[#EEF2FF] shrink-0">
                            {s.tutor_avatar_url ? (
                              <Image
                                src={s.tutor_avatar_url}
                                alt={s.tutor_name}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#6366F1]">
                                {s.tutor_name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span>{s.tutor_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#475569]">
                        {formatDateInZone(s.start_time, displayTimeZone)} ·{" "}
                        {formatTimeInZone(s.start_time, displayTimeZone)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/video/session/${s.id}`} className={mentrixStudent.hubGhostLink}>
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

      {matchmakerGuides.length > 0 && (
        <ScrollRevealCard className={mentrixStudent.hubSticky}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={mentrixHubSurfaces.inkTitle}>Recommended guides</h2>
            <User className="h-5 w-5 text-[#6366F1] opacity-80" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {matchmakerGuides.map((g) => {
              const matchLine = formatMatchedSkillsLine(g.matchedNodes.length);
              return (
              <div
                key={g.guideId}
                className="mx-hub-inner-card rounded-lg px-4 py-4 transition hover:border-[#7C3AED]"
              >
                <div className="flex items-center gap-2">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border border-[#6366F1] bg-[#EEF2FF]">
                    {g.avatarUrl ? (
                      <Image src={g.avatarUrl} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#6366F1]">
                        {g.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="truncate text-base font-semibold text-[#0B1220]">{g.displayName}</p>
                </div>
                {matchLine ? (
                  <p className="mt-2 text-base text-[#475569]">{matchLine}</p>
                ) : null}
                {g.rematchBadgeLabel ? (
                  <p className="mt-1 text-base font-medium text-[#0891B2]">{g.rematchBadgeLabel}</p>
                ) : null}
                {g.matchedNodes.length > 0 && (
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-base leading-5 text-[#64748B]">
                    {g.matchedNodes.join(", ")}
                  </p>
                )}
                {g.nextAvailableSlot && (
                  <span className="mt-2 inline-block rounded-full border border-[#6366F1] bg-[#EDE9FE] px-2 py-0.5 text-sm font-bold text-[#4F46E5]">
                    Open slots
                  </span>
                )}
                <a href="#browse-guides" className={`mt-3 ${mentrixStudent.hubGhostLink}`}>
                  Book now
                </a>
              </div>
            );
            })}
          </div>
        </ScrollRevealCard>
      )}

      <section id="browse-guides" className="scroll-mt-24">
        <div className={mentrixStudent.hubGuideSticky}>
        <h2 className={mentrixHubSurfaces.inkTitle}>Browse & book</h2>
        <p className={`mt-1 ${mentrixHubSurfaces.inkMuted}`}>
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
          momentumSubscriber={momentumSubscriber}
          sessionCreditAvailable={sessionCreditAvailable}
          packSprintCreditsRemaining={packSprintCreditsRemaining}
          monthlyCreditsRemaining={monthlyCreditsRemaining}
          rematchBadgesByTutorId={rematchBadgesByTutorId}
        />
        </div>
      </section>
    </div>
  );
}

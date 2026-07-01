"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { formatSlotRangeInZone, formatTimeInZone } from "@/shared/core/time-format";
import { formatDurationLabel, getSessionDurationMinutes } from "@/shared/integrations/stripe/checkout-copy";
import { Input } from "@/shared/ui/input";
import { MentrixaFilterSelect } from "@/shared/ui/select-patterns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { CourseTagChip } from "@/shared/ui/chip-patterns";
import { formatUsdFromCents } from "@/features/duels/duel-reward";
import { splitSessionPriceCents, getStudentSessionCheckoutCents } from "@/features/booking/booking-pricing";
import { Typewriter } from "@/shared/ui/typewriter";
import { BookingConfirmationCard } from "@/shared/ui/booking-confirmation-card";
import { GuideRankBadge } from "@/features/guide-rank/components/guide-rank-badge";
import { ImpactScoreBadge } from "@/features/guide-impact/components/impact-score-badge";
import {
  impactForCourseFilter,
  type GuideImpactEntry,
} from "@/features/guide-impact/impact-score-pure";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";

function slotsInNextDays<T extends { start_time: string }>(slots: T[], days: number): T[] {
  const now = Date.now();
  const end = now + days * 86400000;
  return slots.filter((s) => {
    const t = new Date(s.start_time).getTime();
    return t >= now && t <= end;
  });
}

interface Availability {
  id: string;
  tutor_id: string;
  course: string;
  start_time: string;
  end_time: string;
  price_per_session?: number | null;
  tutor?: {
    id: string;
    role: string;
    approved: boolean;
    email?: string;
    display_name?: string | null;
    avatar_url?: string | null;
  };
}

type TutorExpertiseEntry = { course_name: string; proof_description: string; verified: boolean };

interface AvailabilityBrowserProps {
  availability: Availability[];
  courses: string[];
  studentCourseNames?: string[];
  tutorExpertise?: Record<string, TutorExpertiseEntry[]>;
  /** When set, keeps the course filter in sync (e.g. “My courses” chips on the dashboard). */
  syncCourseFilter?: string | null;
  /** IANA timezone for displaying slot instants (student profile or admin viewing student). */
  displayTimeZone?: string;
  guideImpactByTutorId?: Record<string, GuideImpactEntry[]>;
  guideRankByTutorId?: Record<string, string>;
  /** Courses the student has completed quests in — drives default “Highest Impact” sort. */
  questHistorySubjects?: string[];
  /** Active Momentum subscription — member session rate at checkout. */
  momentumSubscriber?: boolean;
}

export function AvailabilityBrowser({
  availability,
  courses,
  studentCourseNames = [],
  tutorExpertise = {},
  syncCourseFilter,
  displayTimeZone = "UTC",
  guideImpactByTutorId = {},
  guideRankByTutorId = {},
  questHistorySubjects = [],
  momentumSubscriber = false,
}: AvailabilityBrowserProps) {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>(
    studentCourseNames.length > 0 ? (studentCourseNames[0] ?? "all") : "all",
  );
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [sortBy, setSortBy] = useState<"impact" | "name">("name");
  const [minImpact80, setMinImpact80] = useState(false);

  const defaultSortByImpact = useMemo(() => {
    if (questHistorySubjects.length === 0) return false;
    if (courseFilter === "all") return true;
    const cf = courseFilter.toLowerCase();
    return questHistorySubjects.some((s) => s.toLowerCase() === cf);
  }, [questHistorySubjects, courseFilter]);

  useEffect(() => {
    setSortBy(defaultSortByImpact ? "impact" : "name");
  }, [defaultSortByImpact]);

  useEffect(() => {
    if (syncCourseFilter == null || syncCourseFilter === undefined) return;
    setCourseFilter(syncCourseFilter);
  }, [syncCourseFilter]);

  const guides = useMemo(() => {
    const map = new Map<
      string,
      {
        tutorId: string;
        name: string;
        email: string;
        avatarUrl: string | null;
        priceCents: number;
        rating: number;
        sessions: number;
        impactScore: number;
        impactSessions: number;
        impactSubject: string | null;
        slots: Availability[];
      }
    >();

    for (const slot of availability) {
      const email = slot.tutor?.email ?? "unknown@example.com";
      const name = slot.tutor?.display_name?.trim() || email.split("@")[0] || "Guide";
      const key = slot.tutor_id ?? email;
      const avatarUrl = slot.tutor?.avatar_url ?? null;
      const tutorId = slot.tutor_id ?? "";
      const impactEntries = guideImpactByTutorId[tutorId] ?? [];
      const courseImpact =
        courseFilter !== "all"
          ? impactForCourseFilter(impactEntries, courseFilter)
          : impactEntries[0] ?? null;

      if (!map.has(key)) {
        map.set(key, {
          tutorId,
          name,
          email,
          avatarUrl,
          priceCents: getStudentSessionCheckoutCents({ momentumSubscriber }),
          rating: 4.8,
          sessions: 24,
          impactScore: courseImpact?.impactScore ?? 0,
          impactSessions: courseImpact?.sessionsCounted ?? 0,
          impactSubject: courseImpact?.subject ?? null,
          slots: [],
        });
      }

      map.get(key)!.slots.push(slot);
    }

    let list = Array.from(map.values());

    if (minImpact80) {
      list = list.filter((g) => g.impactScore > 80 && g.impactSessions >= 3);
    }

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(q) || g.slots.some((s) => s.course.toLowerCase().includes(q)),
      );
    }

    if (courseFilter !== "all") {
      const cf = courseFilter.toLowerCase();
      list = list.filter((g) => g.slots.some((s) => s.course.toLowerCase() === cf));
    }

    return list
      .map((g) => ({
        ...g,
        slots: slotsInNextDays(g.slots, 14),
      }))
      .filter((g) => g.slots.length > 0)
      .sort((a, b) => {
        if (sortBy === "impact") {
          const diff = b.impactScore - a.impactScore;
          if (diff !== 0) return diff;
        }
        return a.name.localeCompare(b.name);
      });
  }, [availability, query, courseFilter, guideImpactByTutorId, minImpact80, sortBy, momentumSubscriber]);

  return (
    <aside>
      <h2 className={`mb-1 text-sm font-medium text-violet-50 h-[20px] ${mentrixProfileType.cardTitleOnDark}`}>
        <Typewriter text="Guides" speed={70} waitTime={8000} />
      </h2>
      <p className="mb-3 text-xs text-violet-200/80">
        Bookable slots in the next 14 days. Times in{" "}
        <span className="font-medium text-violet-100">{displayTimeZone}</span> update in Profile if needed.
      </p>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or course"
        aria-label="Search guides by name or course"
        className={`mb-3 min-h-11 text-xs ${mentrixBrandUi.input}`}
      />

      <MentrixaFilterSelect
        aria-label="Filter guides by course"
        className="mb-4 w-full max-w-xs"
        value={courseFilter}
        onChange={setCourseFilter}
        placeholder="All courses"
        options={[
          { id: "all", label: "All courses" },
          ...courses.map((course) => ({ id: course, label: course })),
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MentrixaFilterSelect
          aria-label="Sort guides"
          value={sortBy}
          onChange={(v) => setSortBy(v as "impact" | "name")}
          options={[
            { id: "impact", label: "Highest Impact" },
            { id: "name", label: "Name (A–Z)" },
          ]}
        />
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-violet-200/85">
          <input
            type="checkbox"
            checked={minImpact80}
            onChange={(e) => setMinImpact80(e.target.checked)}
            className="rounded border-violet-500/40 bg-indigo-950/60"
          />
          Impact Score &gt; 80
        </label>
      </div>

      {guides.length > 0 ? (
        <div className={`divide-y divide-indigo-500/25 border-y border-indigo-500/25 ${mentrixBrandUi.panelMuted} rounded-lg`}>
          {guides.map((guide, idx) => {
            const tutorId = guide.tutorId || (guide.slots[0]?.tutor_id ?? "");
            const expertise = tutorId ? (tutorExpertise[tutorId] ?? []) : [];
            const hasVerifiedCourse = expertise.some((e) => e.verified);

            return (
              <div
                key={idx}
                className="cursor-pointer space-y-1.5 px-3 py-4 transition-colors duration-200 hover:bg-violet-600/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-violet-500/35 bg-indigo-950/60">
                      {guide.avatarUrl ? (
                        <Image
                          src={guide.avatarUrl}
                          alt={guide.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-violet-200">
                          {guide.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium text-violet-50">{guide.name}</span>
                      <span className="block truncate text-xs text-violet-200/75">{guide.email}</span>
                    </div>
                    {hasVerifiedCourse ? <CourseTagChip course="Verified" className="normal-case" /> : null}
                    {guideRankByTutorId[tutorId] ? (
                      <GuideRankBadge
                        rankKey={guideRankByTutorId[tutorId]!}
                        size="sm"
                        showLabel={false}
                      />
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-sm font-medium tabular-nums text-violet-50">
                    {formatUsdFromCents(splitSessionPriceCents(guide.priceCents).totalCents)}
                    <span className="block text-[10px] font-normal text-violet-300/70">incl. fee</span>
                  </div>
                </div>
                {guide.impactSessions >= 3 ? (
                  <ImpactScoreBadge
                    impactScore={guide.impactScore}
                    sessionsCounted={guide.impactSessions}
                    subject={guide.impactSubject ?? undefined}
                    size="sm"
                  />
                ) : null}
                <div className="mt-0.5 text-xs text-violet-200/80">
                  {guide.rating.toFixed(1)} rating · {guide.sessions} sessions
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {guide.slots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSlot(slot);
                      }}
                      className="h-7 border-violet-500/35 bg-indigo-950/60 px-2 text-[10px] text-violet-100 hover:border-violet-400/50"
                    >
                      {slot.course} · {formatTimeInZone(slot.start_time, displayTimeZone)}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <BookingDialog
        slot={selectedSlot}
        onOpenChange={(open) => !open && setSelectedSlot(null)}
        tutorExpertise={tutorExpertise}
        displayTimeZone={displayTimeZone}
        momentumSubscriber={momentumSubscriber}
      />
    </aside>
  );
}

function BookingDialog({
  slot,
  onOpenChange,
  tutorExpertise = {},
  displayTimeZone = "UTC",
  momentumSubscriber = false,
}: {
  slot: Availability | null;
  onOpenChange: (open: boolean) => void;
  tutorExpertise?: Record<string, TutorExpertiseEntry[]>;
  displayTimeZone?: string;
  momentumSubscriber?: boolean;
}) {
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  useEffect(() => {
    setCheckoutBusy(false);
    setCheckoutError(null);
  }, [slot?.id]);
  if (!slot) return null;

  const priceCents = getStudentSessionCheckoutCents({ momentumSubscriber });
  const durationMin = getSessionDurationMinutes(slot.start_time, slot.end_time);
  const scheduleLine = `${formatSlotRangeInZone(slot.start_time, slot.end_time, displayTimeZone)} · ${formatDurationLabel(durationMin)}`;
  const expertise = slot.tutor_id ? (tutorExpertise[slot.tutor_id] ?? []) : [];
  const courseExpertise = expertise.find(
    (e) => e.course_name.toLowerCase() === slot.course.toLowerCase(),
  );
  const tutorName =
    slot.tutor?.display_name?.trim() ?? slot.tutor?.email?.split("@")[0] ?? "Guide";

  async function handleBook() {
    if (!slot) return;
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityId: slot.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setCheckoutError(
          data.error ??
            (res.status === 409
              ? "This slot was just booked or another learner is checking out. Please pick a different time."
              : "Failed to start checkout"),
        );
        setCheckoutBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setCheckoutBusy(false);
    }
  }

  return (
    <Dialog open={!!slot} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-lg overflow-y-auto p-0 border-none bg-transparent shadow-none">
        <DialogTitle className="sr-only">
          Book session — {tutorName} · {slot.course}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {scheduleLine}. Confirm to open secure checkout. You can cancel from this dialog.
        </DialogDescription>
        <BookingConfirmationCard
          tutorName={tutorName}
          tutorEmail={slot.tutor?.email ?? ""}
          tutorAvatarUrl={slot.tutor?.avatar_url}
          courseName={slot.course}
          scheduleLine={scheduleLine}
          qualifications={courseExpertise?.proof_description}
          priceCents={priceCents}
          momentumSubscriber={momentumSubscriber}
          onConfirm={handleBook}
          onCancel={() => onOpenChange(false)}
          loading={checkoutBusy}
          errorMessage={checkoutError}
        />
      </DialogContent>
    </Dialog>
  );
}

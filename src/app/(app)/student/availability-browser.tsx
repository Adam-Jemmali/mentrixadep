"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { formatSlotRangeInZone, formatTimeInZone } from "@/lib/time-format";
import { formatDurationLabel, getSessionDurationMinutes } from "@/lib/stripe-checkout-copy";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookSessionButton } from "./book-session-button";
import { Badge } from "@/components/ui/badge";
import { formatUsdFromCents } from "@/lib/duel-reward";
import { BookingPriceBreakdown } from "@/components/booking-price-breakdown";
import { splitSessionPriceCents } from "@/lib/booking-pricing";

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
}

export function AvailabilityBrowser({
  availability,
  courses,
  studentCourseNames = [],
  tutorExpertise = {},
  syncCourseFilter,
  displayTimeZone = "UTC",
}: AvailabilityBrowserProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>(
    studentCourseNames.length > 0 ? (studentCourseNames[0] ?? "all") : "all",
  );
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);

  useEffect(() => {
    if (syncCourseFilter == null || syncCourseFilter === undefined) return;
    setCourseFilter(syncCourseFilter);
  }, [syncCourseFilter]);

  const guides = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        email: string;
        avatarUrl: string | null;
        priceCents: number;
        rating: number;
        sessions: number;
        slots: Availability[];
      }
    >();

    for (const slot of availability) {
      const email = slot.tutor?.email ?? "unknown@example.com";
      const name = slot.tutor?.display_name?.trim() || email.split("@")[0] || "Guide";
      const key = slot.tutor_id ?? email;
      const avatarUrl = slot.tutor?.avatar_url ?? null;

      if (!map.has(key)) {
        map.set(key, {
          name,
          email,
          avatarUrl,
          priceCents: slot.price_per_session ?? 2500,
          rating: 4.8,
          sessions: 24,
          slots: [],
        });
      }

      map.get(key)!.slots.push(slot);
    }

    let list = Array.from(map.values());

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
      .filter((g) => g.slots.length > 0);
  }, [availability, query, courseFilter]);

  const activeCourseName = courseFilter === "all" ? "" : courseFilter;

  async function submitWaitlistRequest() {
    const email = waitlistEmail.trim().toLowerCase();
    if (!email) {
      setWaitlistMessage("Enter your email so we can notify you.");
      return;
    }

    setWaitlistBusy(true);
    setWaitlistMessage(null);
    try {
      const response = await fetch("/api/waitlist/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          courseName: activeCourseName || undefined,
          pagePath: pathname,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setWaitlistMessage(body.error ?? "Could not save your request right now.");
        return;
      }

      setWaitlistMessage("You are on the notify list. We will email you when a guide joins.");
      setWaitlistEmail("");
    } catch {
      setWaitlistMessage("Could not save your request right now.");
    } finally {
      setWaitlistBusy(false);
    }
  }

  return (
    <aside>
      <h2 className="mb-1 text-sm font-medium text-slate-900">Guides</h2>
      <p className="mb-3 text-xs text-slate-500">
        Bookable slots in the next 14 days. Times in{" "}
        <span className="font-medium text-slate-700">{displayTimeZone}</span> — update in Profile if needed.
      </p>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or course"
        className="h-8 mb-3 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
      />

      <Select value={courseFilter} onValueChange={setCourseFilter}>
        <SelectTrigger className="h-8 mb-4 text-xs bg-white border-slate-200 text-slate-900">
          <SelectValue placeholder="All courses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All courses</SelectItem>
          {courses.map((course) => (
            <SelectItem key={course} value={course}>
              {course}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white rounded-lg">
        {guides.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-medium text-slate-800">
              No guides {activeCourseName ? `in ${activeCourseName}` : "available"} yet.
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Join the waitlist and we will notify you as soon as a guide is available.
            </p>
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="you@school.edu or personal email"
                className="h-8 w-full max-w-xs text-xs bg-white border-slate-200"
              />
              <Button
                type="button"
                size="sm"
                disabled={waitlistBusy || !waitlistEmail.trim()}
                onClick={() => void submitWaitlistRequest()}
              >
                {waitlistBusy ? "Saving..." : "Notify me"}
              </Button>
            </div>
            {waitlistMessage ? <p className="mt-2 text-xs text-slate-600">{waitlistMessage}</p> : null}
          </div>
        ) : (
          guides.map((guide, idx) => {
            const tutorId = guide.slots[0]?.tutor_id ?? "";
            const expertise = tutorId ? (tutorExpertise[tutorId] ?? []) : [];
            const hasVerifiedCourse = expertise.some((e) => e.verified);

            return (
            <div
              key={idx}
              className="cursor-pointer space-y-1.5 px-3 py-4 transition-colors duration-200 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shrink-0">
                    {guide.avatarUrl ? (
                      <Image
                        src={guide.avatarUrl}
                        alt={guide.name}
                        width={32}
                        height={32}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-600">
                        {guide.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{guide.name}</span>
                    <span className="block truncate text-xs text-slate-500">{guide.email}</span>
                  </div>
                  {hasVerifiedCourse && (
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] font-medium text-slate-700"
                    >
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="shrink-0 text-right text-sm font-medium text-slate-900 tabular-nums">
                  {formatUsdFromCents(splitSessionPriceCents(guide.priceCents).totalCents)}
                  <span className="block text-[10px] font-normal text-slate-500">incl. fee</span>
                </div>
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {guide.rating.toFixed(1)} rating · {guide.sessions} sessions
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {guide.slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSlot(slot);
                    }}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50"
                  >
                    {slot.course} · {formatTimeInZone(slot.start_time, displayTimeZone)}
                  </button>
                ))}
              </div>
            </div>
          );
          })
        )}
      </div>

      <BookingDialog
        slot={selectedSlot}
        onOpenChange={(open) => !open && setSelectedSlot(null)}
        tutorExpertise={tutorExpertise}
        displayTimeZone={displayTimeZone}
      />
    </aside>
  );
}

function BookingDialog({
  slot,
  onOpenChange,
  tutorExpertise = {},
  displayTimeZone = "UTC",
}: {
  slot: Availability | null;
  onOpenChange: (open: boolean) => void;
  tutorExpertise?: Record<string, TutorExpertiseEntry[]>;
  displayTimeZone?: string;
}) {
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  useEffect(() => {
    setCheckoutBusy(false);
  }, [slot?.id]);
  if (!slot) return null;

  const priceCents = slot.price_per_session ?? 2500;
  const durationMin = getSessionDurationMinutes(slot.start_time, slot.end_time);
  const scheduleLine = `${formatSlotRangeInZone(slot.start_time, slot.end_time, displayTimeZone)} · ${formatDurationLabel(durationMin)}`;
  const expertise = slot.tutor_id ? (tutorExpertise[slot.tutor_id] ?? []) : [];
  const courseExpertise = expertise.find(
    (e) => e.course_name.toLowerCase() === slot.course.toLowerCase(),
  );

  return (
    <Dialog open={!!slot} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[min(96vw,42rem)] flex-col overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-none">
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-medium tracking-tight text-white">
                Book a session
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Confirm the session details, then continue to secure checkout.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm text-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shrink-0">
                      {slot.tutor?.avatar_url ? (
                        <Image
                          src={slot.tutor.avatar_url}
                          alt={slot.tutor?.display_name ?? slot.tutor?.email ?? "Guide"}
                          width={32}
                          height={32}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-white">
                          {((slot.tutor?.display_name ?? slot.tutor?.email ?? "Guide").slice(0, 1) || "G").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-medium text-slate-900">
                        {slot.tutor?.display_name?.trim() ?? slot.tutor?.email?.split("@")[0] ?? "Guide"}
                      </p>
                      {slot.tutor?.email ? <p className="text-xs text-slate-500">{slot.tutor.email}</p> : null}
                    </div>
                  </div>
                  {courseExpertise?.verified && (
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                    >
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="mt-2 font-medium leading-snug text-slate-900">{slot.course}</p>
                <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">{scheduleLine}</p>
              </div>

              {courseExpertise && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Qualifications
                  </p>
                  <p className="text-sm leading-relaxed text-slate-800">{courseExpertise.proof_description}</p>
                </div>
              )}

              <div className="relative rounded-md border border-slate-200 bg-white px-4 py-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Pricing</p>
                <BookingPriceBreakdown sessionPriceCents={priceCents} />
                <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600">
                  Stripe checkout lists the session and the 5% platform fee as separate line items. If the guide
                  declines, you are refunded automatically. Cancel 60+ minutes before the session per policy.
                </p>
                {checkoutBusy ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/90">
                    <p className="text-sm font-medium text-slate-800">Opening secure checkout…</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 z-10 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <DialogClose asChild>
              <Button variant="outline" size="default" className="h-10 w-full border-slate-300 sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
            <BookSessionButton availabilityId={slot.id} onBusyChange={setCheckoutBusy} />
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

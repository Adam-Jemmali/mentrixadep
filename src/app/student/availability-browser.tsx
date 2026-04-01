"use client";

import { useMemo, useState } from "react";
import { formatTime } from "@/lib/time-format";
import { formatDurationLabel, getSessionDurationMinutes } from "@/lib/stripe-checkout-copy";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookSessionButton } from "./book-session-button";
import { Badge } from "@/components/ui/badge";
import { formatUsdFromCents } from "@/lib/duel-reward";

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
  };
}

type TutorExpertiseEntry = { course_name: string; proof_description: string; verified: boolean };

interface AvailabilityBrowserProps {
  availability: Availability[];
  courses: string[];
  studentCourseNames?: string[];
  tutorExpertise?: Record<string, TutorExpertiseEntry[]>;
}

export function AvailabilityBrowser({
  availability,
  courses,
  studentCourseNames = [],
  tutorExpertise = {},
}: AvailabilityBrowserProps) {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>(
    studentCourseNames.length > 0 ? (studentCourseNames[0] ?? "all") : "all",
  );
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);

  const guides = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        priceCents: number;
        rating: number;
        sessions: number;
        slots: Availability[];
      }
    >();

    for (const slot of availability) {
      const email = slot.tutor?.email ?? "unknown@example.com";
      const name = email.split("@")[0] ?? "unknown";
      const key = slot.tutor_id ?? email;

      if (!map.has(key)) {
        map.set(key, {
          name,
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

    return list;
  }, [availability, query, courseFilter]);

  return (
    <aside>
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Guides</h2>

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
          <div className="py-8 text-center text-xs font-medium text-slate-700">No guides available.</div>
        ) : (
          guides.map((guide, idx) => {
            const tutorId = guide.slots[0]?.tutor_id ?? "";
            const expertise = tutorId ? (tutorExpertise[tutorId] ?? []) : [];
            const hasVerifiedCourse = expertise.some((e) => e.verified);

            return (
            <div
              key={idx}
              className="mentrixa-interactive cursor-pointer py-4 space-y-1.5 hover:bg-slate-50 px-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-slate-900">{guide.name}</span>
                  {hasVerifiedCourse && (
                    <Badge variant="default" className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 px-1.5 py-0">
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900 shrink-0 text-right">
                  {formatUsdFromCents(guide.priceCents)}
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
                    onClick={() => setSelectedSlot(slot)}
                    className="border border-slate-200 text-xs text-slate-700 px-2.5 py-1 rounded hover:border-mentrixa-300 hover:text-mentrixa-700 hover:bg-mentrixa-50 transition-all duration-150"
                  >
                    {slot.course} · {formatTime(slot.start_time)}
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
      />
    </aside>
  );
}

function BookingDialog({
  slot,
  onOpenChange,
  tutorExpertise = {},
}: {
  slot: Availability | null;
  onOpenChange: (open: boolean) => void;
  tutorExpertise?: Record<string, TutorExpertiseEntry[]>;
}) {
  if (!slot) return null;

  const priceCents = slot.price_per_session ?? 2500;
  const durationMin = getSessionDurationMinutes(slot.start_time, slot.end_time);
  const scheduleLine = `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)} · ${formatDurationLabel(durationMin)}`;
  const expertise = slot.tutor_id ? (tutorExpertise[slot.tutor_id] ?? []) : [];
  const courseExpertise = expertise.find(
    (e) => e.course_name.toLowerCase() === slot.course.toLowerCase(),
  );

  return (
    <Dialog open={!!slot} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-2 border-neutral-900 bg-white p-5 text-neutral-950 shadow-2xl sm:max-w-md dark:border-neutral-900 dark:bg-white dark:text-neutral-950">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-black dark:text-black">
            Book a session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-base text-black dark:text-black">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-bold text-black dark:text-black">
                {slot.tutor?.email?.split("@")[0] ?? "Guide"}
              </p>
              {courseExpertise?.verified && (
                <Badge className="border border-emerald-800 bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Verified
                </Badge>
              )}
            </div>
            <p className="mt-2 text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-900">
              {slot.course}
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-neutral-900 dark:text-neutral-900">
              {scheduleLine}
            </p>
          </div>

          {courseExpertise && (
            <div className="rounded-lg border-2 border-neutral-400 bg-neutral-100 px-3 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-900">
                Qualifications
              </p>
              <p className="text-sm leading-relaxed text-neutral-950">{courseExpertise.proof_description}</p>
            </div>
          )}

          <div className="rounded-lg border-2 border-mentrixa-600 bg-mentrixa-50 px-4 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base font-bold text-neutral-950">Session fee</span>
              <span className="text-2xl font-black tabular-nums text-neutral-950">
                {formatUsdFromCents(priceCents)}
              </span>
            </div>
            <p className="mt-3 border-t-2 border-mentrixa-200 pt-3 text-sm font-medium leading-relaxed text-neutral-900">
              Secure checkout on Stripe shows the same date, time window, and length. If the tutor declines,
              you are refunded automatically. Cancel 60+ minutes before the session per policy.
            </p>
          </div>
        </div>
        <DialogFooter className="flex-col gap-3 border-t-2 border-neutral-200 pt-4 sm:flex-row sm:justify-end dark:border-neutral-200">
          <DialogClose asChild>
            <Button
              variant="outline"
              size="default"
              className="h-11 w-full border-2 border-neutral-800 bg-white text-base font-semibold text-black hover:bg-neutral-100 sm:w-auto dark:border-neutral-800 dark:bg-white dark:text-black"
            >
              Cancel
            </Button>
          </DialogClose>
          <BookSessionButton availabilityId={slot.id} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

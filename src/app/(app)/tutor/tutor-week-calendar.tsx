"use client";

import { useEffect, useMemo, useState } from "react";
import { JoinVideoCallButton } from "@/components/join-video-call-button";
import { formatTimeRangeInZone, getDayKeyInZone, formatDateInZone } from "@/lib/time-format";
import { cn } from "@/lib/utils";
import { TutorAvatar } from "../student/session-components/tutor-avatar";

type CalendarPayload = {
  weekRange: { startIso: string; endIso: string };
  availability: Array<{
    id: string;
    course: string;
    start_time: string;
    end_time: string;
    active?: boolean | null;
    booking_status?: string | null;
  }>;
  sessions: Array<{
    id: string;
    course: string;
    start_time: string;
    end_time: string;
    status: string;
    student_profile: {
      display_name: string | null;
      avatar_url: string | null;
    };
  }>;
};

type Slot =
  | { kind: "available"; id: string; course: string; start: string; end: string; active: boolean }
  | {
      kind: "booked";
      id: string;
      course: string;
      start: string;
      end: string;
      status: string;
      studentName: string;
      studentAvatar: string | null;
    };

export function TutorWeekCalendar({
  calendar,
  displayTimezone,
}: {
  calendar: CalendarPayload;
  displayTimezone: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const { dayKeys, labels, slotsByDay } = useMemo(() => {
    const start = new Date(calendar.weekRange.startIso);
    const end = new Date(calendar.weekRange.endIso);
    const dayCount = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const keys: string[] = [];
    const lbl: string[] = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = getDayKeyInZone(d, displayTimezone);
      keys.push(key);
      lbl.push(formatDateInZone(d, displayTimezone));
    }

    const combined: Slot[] = [];
    const sessionsLive = calendar.sessions.filter(
      (s) => (s.status ?? "").toLowerCase() !== "cancelled",
    );

    function overlapsBooked(avStart: string, avEnd: string): boolean {
      const a0 = new Date(avStart).getTime();
      const a1 = new Date(avEnd).getTime();
      return sessionsLive.some((s) => {
        const b0 = new Date(s.start_time).getTime();
        const b1 = new Date(s.end_time).getTime();
        return a0 < b1 && b0 < a1;
      });
    }

    for (const s of calendar.sessions) {
      if ((s.status ?? "").toLowerCase() === "cancelled") {
        continue;
      }
      combined.push({
        kind: "booked",
        id: s.id,
        course: s.course,
        start: s.start_time,
        end: s.end_time,
        status: s.status ?? "scheduled",
        studentName: s.student_profile?.display_name ?? "Student",
        studentAvatar: s.student_profile?.avatar_url ?? null,
      });
    }

    for (const a of calendar.availability) {
      const bs = a.booking_status ?? "available";
      if (bs === "booked") continue;
      if (overlapsBooked(a.start_time, a.end_time)) continue;
      combined.push({
        kind: "available",
        id: a.id,
        course: a.course,
        start: a.start_time,
        end: a.end_time,
        active: a.active !== false,
      });
    }

    combined.sort((x, y) => new Date(x.start).getTime() - new Date(y.start).getTime());

    const byDay = new Map<string, Slot[]>();
    for (const k of keys) byDay.set(k, []);
    for (const slot of combined) {
      const k = getDayKeyInZone(slot.start, displayTimezone);
      if (!byDay.has(k)) continue;
      byDay.get(k)!.push(slot);
    }

    return { dayKeys: keys, labels: lbl, slotsByDay: byDay };
  }, [calendar, displayTimezone]);


  function slotStyle(slot: Slot): { className: string; label: string } {
    const endMs = new Date(slot.end).getTime();
    const isPast = now ? endMs <= now : false;

    if (slot.kind === "booked") {
      if (isPast || slot.status === "completed" || slot.status === "cancelled") {
        return {
          className: "border-slate-200 bg-slate-100 text-slate-600",
          label: slot.status === "cancelled" ? "Past · cancelled" : "Past",
        };
      }
      return {
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        label: "Booked",
      };
    }

    if (!slot.active) {
      return {
        className: "border border-dashed border-slate-300 bg-slate-50 text-slate-700",
        label: isPast ? "Past · hidden" : "Hidden from learners",
      };
    }

    return {
      className: isPast
        ? "border-slate-200 bg-slate-100 text-slate-500"
        : "border-indigo-200 bg-indigo-50 text-indigo-950",
      label: isPast ? "Past" : "Open",
    };
  }

  return (
    <div className="overflow-x-auto border-t border-slate-200 pt-4">
      <div
        className="grid gap-2"
        style={{
          minWidth: `${Math.max(dayKeys.length * 170, 720)}px`,
          gridTemplateColumns: `repeat(${dayKeys.length}, minmax(0, 1fr))`,
        }}
      >
        {dayKeys.map((key, idx) => (
          <div key={key} className="min-w-0">
            <div className="mb-2 text-center text-xs font-medium text-slate-700">{labels[idx]}</div>
            <div className="flex min-h-[120px] flex-col gap-2">
              {(slotsByDay.get(key) ?? []).map((slot) => {
                const { className, label } = slotStyle(slot);
                const showJoin =
                  slot.kind === "booked" &&
                  (!now || new Date(slot.end).getTime() > now) &&
                  slot.status !== "cancelled";
                const body = (
                  <>
                    <div className="font-medium">
                      {formatTimeRangeInZone(slot.start, slot.end, displayTimezone)}
                    </div>
                    <div className="font-bold text-xs truncate mb-1">
                      {slot.course.toUpperCase()}
                    </div>
                    {slot.kind === "booked" && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <TutorAvatar 
                          displayName={slot.studentName} 
                          emailPrefix={slot.studentName} 
                          avatarUrl={slot.studentAvatar} 
                          size="sm" 
                          verified={false}
                        />
                        <div className="text-[10px] opacity-70 truncate">
                          with {slot.studentName}
                        </div>
                      </div>
                    )}
                    <div className="mt-0.5 text-[10px] opacity-80">{label}</div>
                    {showJoin ? (
                      <div className="mt-2">
                        <JoinVideoCallButton
                          sessionId={slot.id}
                          startTime={slot.start}
                          endTime={slot.end}
                        />
                      </div>
                    ) : null}
                  </>
                );

                return (
                  <div
                    key={`${slot.kind}-${slot.id}`}
                    className={cn(
                      "rounded border px-2 py-1.5 text-left text-[11px] leading-snug transition-colors duration-150",
                      className,
                    )}
                    aria-label={`${label} ${slot.course} ${formatTimeRangeInZone(slot.start, slot.end, displayTimezone)}`}
                  >
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

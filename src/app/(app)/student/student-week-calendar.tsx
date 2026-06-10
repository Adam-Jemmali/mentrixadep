"use client";

import { useEffect, useMemo, useState } from "react";
import { JoinVideoCallButton } from "@/features/video/join-video-call-button";
import { formatTimeRangeInZone, getDayKeyInZone, formatDateInZone } from "@/shared/core/time-format";
import { cn } from "@/shared/core/utils";
import { TutorAvatar } from "./session-components/tutor-avatar";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type CalendarPayload = {
  weekRange: { startIso: string; endIso: string };
  sessions: Array<{
    id: string;
    course: string;
    start_time: string;
    end_time: string;
    status: string;
    tutor: { display_name: string | null; avatar_url: string | null };
  }>;
  sessionRequests: Array<{
    id: string;
    status: string;
    availability?: {
      course: string;
      start_time: string;
      end_time: string;
    };
    tutor: { display_name: string | null; avatar_url: string | null };
  }>;
};

type Slot =
  | { 
      kind: "booked"; 
      id: string; 
      course: string; 
      start: string; 
      end: string; 
      status: string; 
      tutorName: string;
      tutorAvatar: string | null;
    }
  | { 
      kind: "request"; 
      id: string; 
      course: string; 
      start: string; 
      end: string; 
      status: string; 
      tutorName: string;
      tutorAvatar: string | null;
    };


export function StudentWeekCalendar({
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
    
    // Add confirmed sessions
    for (const s of calendar.sessions) {
      if ((s.status ?? "").toLowerCase() === "cancelled") continue;
      combined.push({
        kind: "booked",
        id: s.id,
        course: s.course,
        start: s.start_time,
        end: s.end_time,
        status: s.status ?? "scheduled",
        tutorName: s.tutor.display_name ?? "Guide",
        tutorAvatar: s.tutor.avatar_url ?? null,
      });
    }

    // Add pending/rejected requests
    for (const r of calendar.sessionRequests) {
      if (!r.availability) continue;
      if (r.status === "approved") continue; // Already in sessions
      combined.push({
        kind: "request",
        id: r.id,
        course: r.availability.course,
        start: r.availability.start_time,
        end: r.availability.end_time,
        status: r.status,
        tutorName: r.tutor.display_name ?? "Guide",
        tutorAvatar: r.tutor.avatar_url ?? null,
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


  function slotStyle(slot: Slot): { className: string; label: string; icon: React.ReactNode } {
    const endMs = new Date(slot.end).getTime();
    const isPast = now ? endMs <= now : false;

    if (slot.kind === "booked") {
      if (isPast || slot.status === "completed") {
        return {
          className: "border-slate-800 bg-slate-900/50 text-slate-500",
          label: "Past",
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      }
      return {
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        label: "Confirmed",
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    }

    if (slot.status === "pending") {
      return {
        className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
        label: "Waiting for Guide",
        icon: <Clock className="w-3 h-3 animate-pulse" />,
      };
    }

    if (slot.status === "rejected") {
      return {
        className: "border-red-500/30 bg-red-500/10 text-red-400",
        label: "Declined",
        icon: <XCircle className="w-3 h-3" />,
      };
    }

    return {
      className: "border-slate-700 bg-slate-800 text-slate-400",
      label: slot.status,
      icon: <AlertCircle className="w-3 h-3" />,
    };
  }

  return (
    <div className="overflow-x-auto border-t border-slate-800 pt-6 mt-4">
      <div
        className="grid gap-3"
        style={{
          minWidth: `${Math.max(dayKeys.length * 200, 800)}px`,
          gridTemplateColumns: `repeat(${dayKeys.length}, minmax(0, 1fr))`,
        }}
      >
        {dayKeys.map((key, idx) => (
          <div key={key} className="min-w-0">
            <div className="mb-4 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{(labels[idx] || '').split(' ')[0]}</div>
              <div className="text-sm font-bold text-white">{(labels[idx] || '').split(' ').slice(1).join(' ')}</div>
            </div>
            <div className="flex min-h-[160px] flex-col gap-3">
              {(slotsByDay.get(key) ?? []).map((slot) => {
                const { className, label, icon } = slotStyle(slot);
                const showJoin =
                  slot.kind === "booked" &&
                  (!now || new Date(slot.end).getTime() > now) &&
                  slot.status !== "cancelled";
                
                return (
                  <div
                    key={`${slot.kind}-${slot.id}`}
                    className={cn(
                      "group relative rounded-xl border p-3 text-left transition-all duration-300 hover:scale-[1.02]",
                      className,
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-[10px] font-bold tracking-tight bg-white/10 px-1.5 py-0.5 rounded uppercase">
                        {formatTimeRangeInZone(slot.start, slot.end, displayTimezone)}
                      </div>
                      {icon}
                    </div>
                    
                    <div className="font-bold text-white text-xs truncate mb-1">
                      {slot.course.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TutorAvatar 
                        displayName={slot.tutorName} 
                        emailPrefix={slot.tutorName} 
                        avatarUrl={slot.tutorAvatar} 
                        size="sm" 
                      />
                      <div className="text-[10px] opacity-70 truncate">
                        with {slot.tutorName}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
                      <span>{label}</span>
                    </div>

                    {showJoin && (
                      <div className="mt-3">
                        <JoinVideoCallButton
                          sessionId={slot.id}
                          startTime={slot.start}
                          endTime={slot.end}
                          className="w-full h-7 text-[10px]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {slotsByDay.get(key)?.length === 0 && (
                <div className="flex-1 rounded-xl border border-dashed border-slate-800 flex items-center justify-center">
                  <span className="text-[10px] text-slate-600 font-medium">Free</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

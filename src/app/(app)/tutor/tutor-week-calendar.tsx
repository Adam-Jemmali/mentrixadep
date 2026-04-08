"use client";

import { useMemo } from "react";
import { JoinVideoCallButton } from "@/components/join-video-call-button";
import { formatTimeRangeInZone } from "@/lib/time-format";
import { cn } from "@/lib/utils";

type CalendarPayload = {
  weekRange: { startIso: string; endIso: string };
  availability: Array<{
    id: string;
    course: string;
    start_time: string;
    end_time: string;
  }>;
  sessions: Array<{
    id: string;
    course: string;
    start_time: string;
    end_time: string;
    status: string;
  }>;
};

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

type Slot =
  | { kind: "available"; id: string; course: string; start: string; end: string }
  | {
      kind: "booked";
      id: string;
      course: string;
      start: string;
      end: string;
      status: string;
    };

export function TutorWeekCalendar({
  calendar,
  displayTimezone,
}: {
  calendar: CalendarPayload;
  displayTimezone: string;
}) {
  const now = Date.now();

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
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      keys.push(key);
      lbl.push(
        d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      );
    }

    const combined: Slot[] = [];
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
      });
    }
    combined.sort((x, y) => new Date(x.start).getTime() - new Date(y.start).getTime());

    const byDay = new Map<string, Slot[]>();
    for (const k of keys) byDay.set(k, []);
    for (const slot of combined) {
      const k = utcDayKey(slot.start);
      if (!byDay.has(k)) continue;
      byDay.get(k)!.push(slot);
    }

    return { dayKeys: keys, labels: lbl, slotsByDay: byDay };
  }, [calendar]);

  function slotStyle(slot: Slot): { className: string; label: string } {
    const endMs = new Date(slot.end).getTime();
    const isPast = endMs <= now;

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

    return {
      className: "border-slate-200 bg-slate-100 text-slate-500",
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
                  new Date(slot.end).getTime() > now &&
                  slot.status !== "cancelled";
                const body = (
                  <>
                    <div className="font-medium">
                      {formatTimeRangeInZone(slot.start, slot.end, displayTimezone)}
                    </div>
                    <div className="truncate opacity-90">{slot.course}</div>
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

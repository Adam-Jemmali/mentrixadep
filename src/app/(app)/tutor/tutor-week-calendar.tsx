"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteAvailability } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { formatTimeRange } from "@/lib/time-format";
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

export function TutorWeekCalendar({ calendar }: { calendar: CalendarPayload }) {
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const now = Date.now();

  const { dayKeys, labels, slotsByDay } = useMemo(() => {
    const start = new Date(calendar.weekRange.startIso);
    const keys: string[] = [];
    const lbl: string[] = [];
    for (let i = 0; i < 7; i++) {
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
    for (const a of calendar.availability) {
      combined.push({
        kind: "available",
        id: a.id,
        course: a.course,
        start: a.start_time,
        end: a.end_time,
      });
    }
    for (const s of calendar.sessions) {
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

  async function handleRemoveAvailability(id: string) {
    if (!confirm("Remove this open slot? Learners will no longer see it.")) return;
    try {
      await deleteAvailability(id, viewingAsUserId ?? undefined);
      router.refresh();
    } catch {
      /* toast optional */
    }
  }

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
        className: "border-blue-200 bg-blue-50 text-blue-900",
        label: "Booked",
      };
    }

    if (isPast) {
      return {
        className: "border-slate-200 bg-slate-100 text-slate-500",
        label: "Past · open slot",
      };
    }
    return {
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      label: "Open",
    };
  }

  return (
    <div className="overflow-x-auto border-t border-slate-200 pt-4">
      <div className="grid min-w-[720px] grid-cols-7 gap-2">
      {dayKeys.map((key, idx) => (
        <div key={key} className="min-w-0">
          <div className="mb-2 text-center text-xs font-medium text-slate-700">{labels[idx]}</div>
          <div className="flex min-h-[120px] flex-col gap-2">
            {(slotsByDay.get(key) ?? []).map((slot) => {
              const { className, label } = slotStyle(slot);
              const isClickable = slot.kind === "available" && new Date(slot.end).getTime() > now;
              const body = (
                <>
                  <div className="font-medium">{formatTimeRange(slot.start, slot.end)}</div>
                  <div className="truncate opacity-90">{slot.course}</div>
                  <div className="mt-0.5 text-[10px] opacity-80">{label}</div>
                </>
              );
              const wrapClass = cn(
                "rounded border px-2 py-1.5 text-left text-[11px] leading-snug transition-colors duration-150",
                className,
                isClickable &&
                  "cursor-pointer hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-400",
              );

              if (isClickable) {
                return (
                  <button
                    key={`${slot.kind}-${slot.id}`}
                    type="button"
                    onClick={() => handleRemoveAvailability(slot.id)}
                    className={wrapClass}
                    aria-label={`Remove open slot ${slot.course} ${formatTimeRange(slot.start, slot.end)}`}
                  >
                    {body}
                  </button>
                );
              }

              return (
                <div
                  key={`${slot.kind}-${slot.id}`}
                  className={cn(wrapClass, "cursor-default")}
                  aria-label={`${label} ${slot.course} ${formatTimeRange(slot.start, slot.end)}`}
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

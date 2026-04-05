"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatInTimeZone } from "date-fns-tz";
import { deleteAvailability, setAvailabilityActive } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { formatTimeRange } from "@/lib/time-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AvailabilityManagerSlot = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  price_per_session?: number | null;
  active?: boolean;
  pending_booking_count?: number;
};

interface AvailabilityManagerProps {
  availability: AvailabilityManagerSlot[];
  displayTimezone: string;
}

export function AvailabilityManager({ availability, displayTimezone }: AvailabilityManagerProps) {
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(availability);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setRows(availability);
  }, [availability]);

  const grouped = useMemo(() => {
    const byCourse = new Map<string, AvailabilityManagerSlot[]>();
    for (const s of rows) {
      if (!byCourse.has(s.course)) byCourse.set(s.course, []);
      byCourse.get(s.course)!.push(s);
    }
    const courses = Array.from(byCourse.keys()).sort((a, b) => a.localeCompare(b));
    return courses.map((course) => {
      const slots = (byCourse.get(course) ?? []).sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
      const byDay = new Map<string, AvailabilityManagerSlot[]>();
      for (const slot of slots) {
        const dayKey = formatInTimeZone(new Date(slot.start_time), displayTimezone, "EEEE · MMM d");
        if (!byDay.has(dayKey)) byDay.set(dayKey, []);
        byDay.get(dayKey)!.push(slot);
      }
      const dayOrder = Array.from(byDay.keys()).sort((a, b) => {
        const sa = byDay.get(a)?.[0]?.start_time;
        const sb = byDay.get(b)?.[0]?.start_time;
        if (!sa || !sb) return 0;
        return new Date(sa).getTime() - new Date(sb).getTime();
      });
      return { course, dayOrder, byDay };
    });
  }, [rows, displayTimezone]);

  async function handleToggle(id: string, next: boolean) {
    const prev = rows.find((r) => r.id === id);
    if (!prev) return;
    setError(null);
    setRows((list) =>
      list.map((r) => (r.id === id ? { ...r, active: next } : r)),
    );
    try {
      await setAvailabilityActive(
        { availabilityId: id, active: next },
        viewingAsUserId ?? undefined,
      );
      router.refresh();
    } catch (err) {
      setRows((list) =>
        list.map((r) => (r.id === id ? { ...r, active: prev.active } : r)),
      );
      setError(err instanceof Error ? err.message : "Could not update slot");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setError(null);
    try {
      await deleteAvailability(deleteId, viewingAsUserId ?? undefined);
      setRows((list) => list.filter((r) => r.id !== deleteId));
      setDeleteId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  const deletingSlot = deleteId ? rows.find((r) => r.id === deleteId) : null;
  const pendingDel = deletingSlot?.pending_booking_count ?? 0;

  return (
    <div>
      {error && <div className="mb-3 text-xs text-red-600">{error}</div>}

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">No upcoming open slots.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ course, dayOrder, byDay }) => (
            <div key={course}>
              <h3 className="text-xs font-medium text-slate-900 mb-2">{course}</h3>
              <div className="space-y-4 border-l border-slate-200 pl-3">
                {dayOrder.map((day) => (
                  <div key={day}>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-2">
                      {day}
                    </p>
                    <ul className="space-y-2">
                      {(byDay.get(day) ?? []).map((slot) => {
                        const cents = slot.price_per_session ?? 2500;
                        const pending = slot.pending_booking_count ?? 0;
                        const active = slot.active !== false;

                        return (
                          <li
                            key={slot.id}
                            className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-slate-900 tabular-nums">
                                {formatTimeRange(slot.start_time, slot.end_time)}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-500">
                                  ${(cents / 100).toFixed(2)}
                                </span>
                                {pending > 0 && (
                                  <Badge variant="outline" className="text-[10px] font-normal bg-slate-50">
                                    {pending} pending booking{pending === 1 ? "" : "s"}
                                  </Badge>
                                )}
                                {!active && (
                                  <Badge variant="outline" className="text-[10px] text-slate-500">
                                    Hidden from learners
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">Active</span>
                                <Switch
                                  checked={active}
                                  onCheckedChange={(v) => handleToggle(slot.id, v)}
                                  aria-label={active ? "Deactivate slot" : "Activate slot"}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-slate-500 hover:text-red-600"
                                onClick={() => setDeleteId(slot.id)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <Image src={MENTRIXA_LOGO_PNG} alt="" width={12} height={12} className="h-3 w-3" />
                                  Delete
                                </span>
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete open slot?</DialogTitle>
            <DialogDescription>
              {pendingDel > 0 ? (
                <span>
                  This slot has {pendingDel} pending learner request{pendingDel === 1 ? "" : "s"}.
                  Decline those requests in Command center before deleting.
                </span>
              ) : (
                <span>This removes the slot from your calendar. Learners will no longer see it.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteId(null)}>
              <span className="inline-flex items-center gap-1.5">
                <Image src={MENTRIXA_LOGO_PNG} alt="" width={12} height={12} className="h-3 w-3" />
                Cancel
              </span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pendingDel > 0}
              onClick={() => void confirmDelete()}
            >
              <span className="inline-flex items-center gap-1.5">
                <Image src={MENTRIXA_LOGO_PNG} alt="" width={12} height={12} className="h-3 w-3" />
                Delete slot
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

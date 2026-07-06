"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { deleteAvailability, setAvailabilityActive } from "@/features/tutor/availability";
import { useAdminViewContext } from "@/components/admin-view-context";
import { formatTimeRangeInZone } from "@/shared/core/time-format";
import { Badge } from "@/shared/ui/badge";
import { MentrixaCountBadge } from "@/shared/ui/badge-patterns";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { GUIDE_SLOTS_MANAGER } from "@/features/tutor/guide-home-copy-pure";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

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
      const res = await setAvailabilityActive(
        { availabilityId: id, active: next },
        viewingAsUserId ?? undefined,
      );
      if (!res.success) {
        throw new Error(res.error);
      }
      router.refresh();
    } catch (err) {
      setRows((list) =>
        list.map((r) => (r.id === id ? { ...r, active: prev.active } : r)),
      );
      setError(err instanceof Error ? err.message : GUIDE_SLOTS_MANAGER.errUpdate);
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
      setError(err instanceof Error ? err.message : GUIDE_SLOTS_MANAGER.errDelete);
    }
  }

  const deletingSlot = deleteId ? rows.find((r) => r.id === deleteId) : null;
  const pendingDel = deletingSlot?.pending_booking_count ?? 0;

  return (
    <div>
      {error && <div className="mb-3 text-xs text-red-600">{error}</div>}

      {rows.length === 0 ? (
        <p className="py-2 text-sm font-medium text-slate-600">{GUIDE_SLOTS_MANAGER.empty}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ course, dayOrder, byDay }) => (
            <div key={course}>
              <h3 className="mb-2 text-sm font-bold tracking-tight text-slate-900">{course}</h3>
              <div className="space-y-4 border-l-2 border-indigo-200 pl-3">
                {dayOrder.map((day) => (
                  <div key={day}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-700">
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
                            className="flex flex-col gap-2 rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold tabular-nums text-slate-900">
                                {formatTimeRangeInZone(slot.start_time, slot.end_time, displayTimezone)}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold tabular-nums text-slate-800">
                                  ${(cents / 100).toFixed(2)} CAD
                                </span>
                                {pending > 0 ? (
                                  <MentrixaCountBadge
                                    count={pending}
                                    color="warning"
                                    variant="soft"
                                    className="normal-case tracking-normal px-2"
                                    label={GUIDE_SLOTS_MANAGER.pendingBooking(pending)}
                                  >
                                    {GUIDE_SLOTS_MANAGER.pendingBooking(pending)}
                                  </MentrixaCountBadge>
                                ) : null}
                                {!active && (
                                  <Badge variant="outline" className="border-slate-400 text-[10px] font-semibold text-slate-800">
                                    {GUIDE_SLOTS_MANAGER.hidden}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700">{GUIDE_SLOTS_MANAGER.active}</span>
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
                                  <img src="/icons/mentrixer.svg" alt="" width={12} height={12} className="shrink-0" />
                                  {GUIDE_SLOTS_MANAGER.delete}
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
            <DialogTitle className="text-purple-600">{GUIDE_SLOTS_MANAGER.deleteTitle}</DialogTitle>
            <DialogDescription>
              {pendingDel > 0 ? (
                <span>{GUIDE_SLOTS_MANAGER.deletePending(pendingDel)}</span>
              ) : (
                <span>{GUIDE_SLOTS_MANAGER.deleteConfirm}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteId(null)}>
              <span className="inline-flex items-center gap-1.5">
                <img src="/icons/mentrixer.svg" alt="" width={12} height={12} className="shrink-0" />
                {GUIDE_SLOTS_MANAGER.cancel}
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
                <img src="/icons/mentrixer.svg" alt="" width={12} height={12} className="shrink-0" />
                {GUIDE_SLOTS_MANAGER.deleteCta}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

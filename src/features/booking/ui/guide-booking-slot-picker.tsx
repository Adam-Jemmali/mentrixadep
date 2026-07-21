"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateValue } from "@internationalized/date";
import { Button } from "@/shared/ui/button";
import { GuideBookingDatePicker } from "@/shared/ui/date-picker-patterns";
import { formatSlotRangeInZone } from "@/shared/core/time-format";
import {
  calendarDateKey,
  datesWithAvailableSlots,
  filterSlotsByCalendarDate,
  firstBookableCalendarDate,
  formatGuideBookingDayVerdict,
  guideBookingWindowBounds,
} from "@/features/booking/guide-booking-date-pure";
import { cn } from "@/shared/core/utils";

export type GuideBookingSlot = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  price_per_session: number | null;
};

export function GuideBookingSlotPicker({
  slots,
  tutorTimezone,
  canBook,
  onBookSlot,
  formatPrice,
  selectOnly = false,
  selectedSlotId = null,
}: {
  slots: GuideBookingSlot[];
  tutorTimezone: string;
  canBook: boolean;
  onBookSlot: (slot: GuideBookingSlot) => void;
  formatPrice: (baseCents: number | null) => string;
  /** When true, row action selects a slot instead of opening checkout immediately. */
  selectOnly?: boolean;
  selectedSlotId?: string | null;
}) {
  const { min, max } = useMemo(
    () => guideBookingWindowBounds(tutorTimezone),
    [tutorTimezone],
  );
  const availableDayKeys = useMemo(
    () => datesWithAvailableSlots(slots, tutorTimezone),
    [slots, tutorTimezone],
  );

  const [selectedDate, setSelectedDate] = useState<DateValue | null>(() =>
    firstBookableCalendarDate(slots, tutorTimezone),
  );

  useEffect(() => {
    setSelectedDate(firstBookableCalendarDate(slots, tutorTimezone));
  }, [slots, tutorTimezone]);

  const daySlots = useMemo(
    () => filterSlotsByCalendarDate(slots, selectedDate, tutorTimezone),
    [slots, selectedDate, tutorTimezone],
  );

  const { verdict, nextAction } = formatGuideBookingDayVerdict(daySlots.length, selectedDate);

  return (
    <div className="space-y-5">
      <GuideBookingDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minValue={min}
        maxValue={max}
        isDisabled={slots.length === 0}
        isDateUnavailable={(date) => !availableDayKeys.has(calendarDateKey(date))}
      />

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3">
        <p className="text-sm font-medium text-slate-800">{verdict}</p>
        <p className="mt-1 text-xs text-slate-500">{nextAction}</p>
      </div>

      {daySlots.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-indigo-50 py-6 text-center text-xs italic text-slate-400">
          {slots.length === 0
            ? "No open slots in the next 14 days."
            : "No sessions on this date. Try another highlighted day."}
        </p>
      ) : (
        <ul className="space-y-3">
          {daySlots.map((slot) => (
            <li
              key={slot.id}
              className={cn(
                "avail-row flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between",
                selectedSlotId === slot.id
                  ? "border-[#7C3AED] bg-[#EDE9FE]/40 shadow-md"
                  : "border-indigo-50 bg-slate-50/30 hover:border-indigo-100 hover:bg-white hover:shadow-md",
              )}
            >
              <div className="space-y-1">
                <p className="text-sm font-black italic tracking-tight text-indigo-900">
                  {slot.course}
                </p>
                <p className="text-xs text-slate-500">
                  {formatSlotRangeInZone(slot.start_time, slot.end_time, tutorTimezone)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-500">
                  {formatPrice(slot.price_per_session)}
                </span>
                {canBook ? (
                  <Button
                    type="button"
                    onClick={() => onBookSlot(slot)}
                    className="h-9 rounded-xl bg-indigo-600 px-4 text-[10px] font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                  >
                    {selectOnly ? "Select" : "Book"}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { createAvailabilitySlots } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";
import { APP_TIMEZONES } from "@/lib/timezones";
import { SESSION_PRICE_CAD_MAX, SESSION_PRICE_CAD_MIN } from "@/lib/availability-schemas";

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

function timeOptions(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

interface CreateAvailabilityFormProps {
  tutorCourseNames: string[];
  defaultTimezone: string;
}

export function CreateAvailabilityForm({
  tutorCourseNames,
  defaultTimezone,
}: CreateAvailabilityFormProps) {
  const [course, setCourse] = useState("");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState("12");
  const [price, setPrice] = useState("25");
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  const times = useMemo(() => timeOptions(), []);
  const triggerClass =
    "mt-1.5 h-9 border-slate-300 bg-white text-slate-950 data-[placeholder]:text-slate-500";
  const contentClass = "z-[120] max-h-56 border-slate-300 bg-white text-slate-950 shadow-xl";

  function toggleDay(d: number) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!course) {
      setError("Select a subject");
      setLoading(false);
      return;
    }
    if (weekdays.size === 0) {
      setError("Select at least one day");
      setLoading(false);
      return;
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice)) {
      setError("Enter a valid price");
      setLoading(false);
      return;
    }
    if (parsedPrice < SESSION_PRICE_CAD_MIN || parsedPrice > SESSION_PRICE_CAD_MAX) {
      setError(
        `Price must be between $${SESSION_PRICE_CAD_MIN} and $${SESSION_PRICE_CAD_MAX} CAD per session`,
      );
      setLoading(false);
      return;
    }

    const rw = Number.parseInt(recurringWeeks, 10);
    if (recurring && (!Number.isFinite(rw) || rw < 1 || rw > 52)) {
      setError("Repeat for 1–52 weeks");
      setLoading(false);
      return;
    }

    const payload = {
      course,
      weekdays: Array.from(weekdays).sort((a, b) => a - b),
      startTime,
      endTime,
      recurring,
      recurringWeeks: recurring ? rw : undefined,
      priceCad: parsedPrice,
      maxStudents: 1 as const,
      timezone,
    };

    try {
      await createAvailabilitySlots(payload, viewingAsUserId ?? undefined);
      setWeekdays(new Set());
      setPrice("25");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create availability");
    } finally {
      setLoading(false);
    }
  }

  const hasCourses = tutorCourseNames.length > 0;

  return (
    <div className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
        Create open slots
      </p>
      <p className="mb-4 text-xs leading-relaxed text-slate-700">
        Times use your timezone below. Learners see slots in their own timezone. Slots must not overlap
        other openings for the same subject.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <Label className="text-slate-900">Subject</Label>
          {hasCourses ? (
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className={triggerClass}>
                <SelectValue placeholder="Select from My expertise" />
              </SelectTrigger>
              <SelectContent className={contentClass}>
                {tutorCourseNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1.5 text-slate-500">Add subjects under My expertise first.</p>
          )}
        </div>

        <div>
          <Label className="text-slate-900">Days</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <label
                key={d.value}
                className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1.5 transition-colors hover:bg-slate-100 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-100"
              >
                <input
                  type="checkbox"
                  className="rounded border-slate-500"
                  checked={weekdays.has(d.value)}
                  onChange={() => toggleDay(d.value)}
                />
                <span className="text-slate-900">{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-900">Start</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentClass}>
                {times.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-900">End</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentClass}>
                {times.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-100 px-3 py-2.5">
          <div>
            <p className="font-medium text-slate-900">Repeat weekly</p>
            <p className="mt-0.5 text-[11px] text-slate-700">
              Off = next occurrence per selected day only. On = same days for multiple weeks.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={recurring}
            onClick={() => setRecurring(!recurring)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-150 ${
              recurring ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform duration-150 ${
                recurring ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {recurring && (
          <div>
            <Label className="text-slate-900">Weeks to repeat</Label>
            <Input
              type="number"
              min={1}
              max={52}
              className="mt-1.5 h-9 border-slate-300 bg-white text-slate-950"
              value={recurringWeeks}
              onChange={(e) => setRecurringWeeks(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-900">Price (CAD / session)</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700">$</span>
              <Input
                type="number"
                min={SESSION_PRICE_CAD_MIN}
                max={SESSION_PRICE_CAD_MAX}
                step={1}
                className="h-9 border-slate-300 bg-white pl-6 text-slate-950"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-600">
              ${SESSION_PRICE_CAD_MIN}–${SESSION_PRICE_CAD_MAX} CAD
            </p>
          </div>
          <div>
            <Label className="text-slate-900">Max Mentrixers</Label>
            <Input
              type="number"
              disabled
              value={1}
              className="mt-1.5 h-9 border-slate-300 bg-slate-100 text-slate-800"
              readOnly
            />
            <p className="mt-1 text-[10px] text-slate-600">Group sessions later</p>
          </div>
        </div>

        <div>
          <Label className="text-slate-900">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[120] max-h-52 border-slate-300 bg-white text-slate-950 shadow-xl">
              {APP_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <Button type="submit" className="w-full h-9 text-xs" disabled={loading || !hasCourses}>
          {loading ? (
            "Creating…"
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={12} height={12} className="h-3 w-3" />
              Create slots
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}

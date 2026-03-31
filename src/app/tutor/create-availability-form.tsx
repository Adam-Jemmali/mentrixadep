"use client";

import { useMemo, useState } from "react";
import { createAvailability } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toDatetimeLocalInputValue } from "@/lib/time-format";

const DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "75", label: "1 h 15 m" },
  { value: "90", label: "1 h 30 m" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
  { value: "480", label: "8 hours" },
];

interface CreateAvailabilityFormProps {
  tutorCourseNames?: string[];
}

export function CreateAvailabilityForm({ tutorCourseNames }: CreateAvailabilityFormProps) {
  const [course, setCourse] = useState("");
  const [startAt, setStartAt] = useState("");
  const [durationMins, setDurationMins] = useState("30");
  const [price, setPrice] = useState<string>("25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();

  const minLocal = useMemo(() => toDatetimeLocalInputValue(new Date()), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!course || !startAt) {
      setError("Course and start time are required");
      setLoading(false);
      return;
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Price must be a positive number");
      setLoading(false);
      return;
    }

    const duration = Number.parseInt(durationMins, 10);
    if (!Number.isFinite(duration) || duration < 15 || duration > 480) {
      setError("Choose a session length between 15 minutes and 8 hours");
      setLoading(false);
      return;
    }

    const startTime = new Date(startAt);
    if (Number.isNaN(startTime.getTime())) {
      setError("Invalid start time — use the date and time picker");
      setLoading(false);
      return;
    }

    if (startTime <= new Date()) {
      setError("Start time must be in the future");
      setLoading(false);
      return;
    }

    try {
      await createAvailability(
        course,
        startTime.toISOString(),
        parsedPrice,
        viewingAsUserId ?? undefined,
        duration,
      );
      setCourse("");
      setStartAt("");
      setDurationMins("30");
      setPrice("25");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create availability");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-slate-200 pt-3 mt-3">
      <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.2em] mb-2">
        Add slot
      </div>
      <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
        Pick any start date and time (minute precision, your device timezone). Length is how long this
        opening stays bookable as one session.
      </p>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 text-xs">
        <div className="col-span-2">
          {tutorCourseNames && tutorCourseNames.length > 0 ? (
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className="h-9 text-xs border-slate-200 text-slate-900">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {tutorCourseNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-slate-600 py-1">
              Add courses in &quot;My Courses&quot; above before creating slots.
            </p>
          )}
        </div>

        <div className="col-span-2">
          <label htmlFor="avail-start" className="sr-only">
            Start date and time
          </label>
          <Input
            id="avail-start"
            type="datetime-local"
            step={60}
            className="h-9 text-xs border-slate-200 text-slate-900"
            min={minLocal ?? undefined}
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>

        <div>
          <Select value={durationMins} onValueChange={setDurationMins}>
            <SelectTrigger className="h-9 text-xs border-slate-200 text-slate-900">
              <SelectValue placeholder="Length" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-600 pointer-events-none">
              $
            </span>
            <Input
              type="number"
              min={1}
              step={1}
              className="h-9 text-xs pl-5 border-slate-200 text-slate-900"
              placeholder="25"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-label="Price per session in dollars"
            />
          </div>
        </div>

        <div className="col-span-2">
          {error && <div className="mb-2 text-xs font-medium text-red-600">{error}</div>}
          <Button type="submit" size="sm" className="w-full" disabled={loading}>
            {loading ? "Adding…" : "Add slot"}
          </Button>
        </div>
      </form>
    </div>
  );
}

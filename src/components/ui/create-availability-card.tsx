"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronDown, Calendar, Clock, DollarSign, Globe, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createAvailabilitySlots } from "@/app/actions/tutor";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";
import { APP_TIMEZONES } from "@/lib/timezones";
import { SESSION_PRICE_CAD_MAX, SESSION_PRICE_CAD_MIN } from "@/lib/availability-schemas";
import { describeAvailabilityScheduleIssue } from "@/lib/availability-slot-builder";
import { addMinutesToHHmm } from "@/lib/teaching-defaults";

const WEEKDAYS: { value: number; label: string; full: string }[] = [
  { value: 0, label: "Mon", full: "Monday" },
  { value: 1, label: "Tue", full: "Tuesday" },
  { value: 2, label: "Wed", full: "Wednesday" },
  { value: 3, label: "Thu", full: "Thursday" },
  { value: 4, label: "Fri", full: "Friday" },
  { value: 5, label: "Sat", full: "Saturday" },
  { value: 6, label: "Sun", full: "Sunday" },
];

function timeOptions(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

interface CreateAvailabilityCardProps {
  tutorCourseNames: string[];
  defaultTimezone: string;
  /** Teaching Defaults — each opening uses exactly this many minutes (start + duration = end). */
  sessionDefaultDurationMinutes: number;
  className?: string;
  enableAnimations?: boolean;
  /** Called after slots are created successfully (e.g. close a dialog before refresh). */
  onSlotsCreated?: () => void;
}

export function CreateAvailabilityCard({
  tutorCourseNames,
  defaultTimezone,
  sessionDefaultDurationMinutes,
  className,
  enableAnimations = true,
  onSlotsCreated,
}: CreateAvailabilityCardProps) {
  // Form State
  const [course, setCourse] = useState(tutorCourseNames[0] || "");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState(() => addMinutesToHHmm("09:00", sessionDefaultDurationMinutes) ?? "10:00");
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState("12");
  const [price, setPrice] = useState("25");
  const [timezone, setTimezone] = useState(defaultTimezone);
  
  // UI State
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [showConfirmationView, setShowConfirmationView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timezoneRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const times = useMemo(() => timeOptions(), []);

  const startTimesValid = useMemo(
    () => times.filter((t) => addMinutesToHHmm(t, sessionDefaultDurationMinutes) != null),
    [times, sessionDefaultDurationMinutes],
  );

  useEffect(() => {
    setStartTime((prev) =>
      startTimesValid.includes(prev) ? prev : (startTimesValid[0] ?? prev),
    );
  }, [startTimesValid]);

  useEffect(() => {
    const end = addMinutesToHHmm(startTime, sessionDefaultDurationMinutes);
    if (end) setEndTime(end);
  }, [startTime, sessionDefaultDurationMinutes]);

  const recurringWeeksNum = useMemo(() => {
    const rw = Number.parseInt(recurringWeeks, 10);
    return Number.isFinite(rw) ? rw : 12;
  }, [recurringWeeks]);

  const scheduleIssue = useMemo(() => {
    if (weekdays.size === 0 || !timezone.trim()) return null;
    return describeAvailabilityScheduleIssue(
      new Date(),
      timezone,
      Array.from(weekdays).sort((a, b) => a - b),
      startTime,
      endTime,
      recurring ? Math.min(52, Math.max(1, recurringWeeksNum)) : 1,
      sessionDefaultDurationMinutes,
    );
  }, [weekdays, timezone, startTime, endTime, recurring, recurringWeeksNum, sessionDefaultDurationMinutes]);

  const timesLookInvalid =
    scheduleIssue !== null &&
    (scheduleIssue.includes("End time must be after") ||
      scheduleIssue.includes("15-minute") ||
      scheduleIssue.includes("Teaching Default") ||
      scheduleIssue.includes("exactly"));

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
      if (timezoneRef.current && !timezoneRef.current.contains(event.target as Node)) {
        setIsTimezoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDay = (d: number) => {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const handleNext = () => {
    setSuccessMessage(null);
    if (!course) {
      setError("Select a subject");
      return;
    }
    if (weekdays.size === 0) {
      setError("Select at least one day");
      return;
    }
    const previewIssue = describeAvailabilityScheduleIssue(
      new Date(),
      timezone,
      Array.from(weekdays).sort((a, b) => a - b),
      startTime,
      endTime,
      recurring ? Math.min(52, Math.max(1, Number.parseInt(recurringWeeks, 10) || 12)) : 1,
      sessionDefaultDurationMinutes,
    );
    if (previewIssue) {
      setError(previewIssue);
      return;
    }
    setError(null);
    setShowConfirmationView(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice)) {
      setError("Enter a valid price");
      setLoading(false);
      return;
    }
    if (parsedPrice < SESSION_PRICE_CAD_MIN || parsedPrice > SESSION_PRICE_CAD_MAX) {
      setError(`Price must be between $${SESSION_PRICE_CAD_MIN} and $${SESSION_PRICE_CAD_MAX} CAD`);
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

    const confirmIssue = describeAvailabilityScheduleIssue(
      new Date(),
      timezone,
      payload.weekdays,
      startTime,
      endTime,
      recurring ? rw : 1,
      sessionDefaultDurationMinutes,
    );
    if (confirmIssue) {
      setError(confirmIssue);
      setLoading(false);
      return;
    }

    let created = false;
    try {
      const res = await createAvailabilitySlots(payload, viewingAsUserId ?? undefined);
      if (!res.success) throw new Error(res.error);
      created = true;
      const n = res.created;

      // Reset and success
      setWeekdays(new Set());
      setPrice("25");
      setShowConfirmationView(false);
      setSuccessMessage(`Created ${n} availability slot${n === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create availability");
    } finally {
      setLoading(false);
    }
    if (created) {
      queueMicrotask(() => onSlotsCreated?.());
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -25, scale: 0.95, filter: "blur(4px)" },
    visible: {
      opacity: 1, x: 0, scale: 1, filter: "blur(0px)",
      transition: { type: "spring", stiffness: 400, damping: 28, mass: 0.6 }
    },
  };

  const hasCourses = tutorCourseNames.length > 0;

  return (
    <motion.div
      variants={shouldAnimate ? containerVariants : {}}
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      className={cn(
        "rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-xl shadow-slate-200/80 overflow-hidden max-w-2xl relative w-full",
        className
      )}
    >
      <div className="relative h-auto min-h-[500px]">
        {/* Main Content */}
        <motion.div
          initial={false}
          animate={{ 
            y: showConfirmationView ? "-20px" : "0px",
            opacity: showConfirmationView ? 0.3 : 1,
            scale: showConfirmationView ? 0.95 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          className="w-full"
        >
          {/* Header */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-6 pb-6 border-b-2 border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-indigo-200 bg-white shadow-sm">
                <Image src={MENTRIXA_LOGO_PNG} alt="Mentrixa" width={28} height={28} className="object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Create availability</h2>
                <p className="text-sm font-medium text-slate-600">Set your schedule and pricing</p>
              </div>
            </div>
          </motion.div>

          {/* Subject Selector */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-6 pb-4 z-50 relative">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
              Subject
            </label>
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                onClick={() => hasCourses && setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                disabled={!hasCourses}
                className={cn(
                  "h-auto w-full justify-between rounded-lg border-2 border-slate-300 bg-white p-3 text-left font-semibold text-slate-900 shadow-sm hover:border-indigo-400 hover:bg-indigo-50/40",
                  isSubjectDropdownOpen && "border-indigo-500 ring-2 ring-indigo-200",
                  !hasCourses && "cursor-not-allowed opacity-50"
                )}
              >
                <span>{course || "Add subjects first"}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-600 transition-transform", isSubjectDropdownOpen && "rotate-180")} />
              </Button>
              <AnimatePresence>
                {isSubjectDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-xl"
                  >
                    {tutorCourseNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => { setCourse(name); setIsSubjectDropdownOpen(false); }}
                        className={cn(
                          "w-full border-b border-slate-100 p-3 text-left text-sm font-semibold text-slate-900 transition-colors last:border-b-0",
                          name === course ? "bg-indigo-100 text-indigo-950" : "bg-white hover:bg-indigo-50"
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Days Selection */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="px-6 pb-6">
            <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-700">
              Days <span className="font-normal normal-case text-slate-500">(tap to toggle)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const isActive = weekdays.has(d.value);
                return (
                  <Button
                    key={d.value}
                    type="button"
                    variant="outline"
                    onClick={() => toggleDay(d.value)}
                    className={cn(
                      "h-auto rounded-lg border-2 px-4 py-2.5 text-sm font-bold transition-all duration-200",
                      isActive
                        ? "border-indigo-700 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600 ring-offset-2 ring-offset-white hover:bg-indigo-700"
                        : "border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50"
                    )}
                  >
                    {d.label}
                  </Button>
                );
              })}
            </div>
          </motion.div>

          {/* Time & Price Section */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="space-y-4 px-6 pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">Start time</label>
                <div className="relative">
                  <select 
                    value={startTime} 
                    onChange={(e) => {
                      const next = e.target.value;
                      setStartTime(next);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    aria-invalid={timesLookInvalid}
                    className={cn(
                      "w-full appearance-none rounded-lg border-2 bg-white p-2.5 pr-9 font-semibold tabular-nums text-slate-900 shadow-sm focus:outline-none focus:ring-2 [&>option]:bg-white [&>option]:text-slate-900",
                      timesLookInvalid ? "border-amber-500 ring-amber-200 focus:ring-amber-400" : "border-slate-300 focus:ring-indigo-500",
                    )}
                  >
                    {(startTimesValid.length ? startTimesValid : times).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">Session end</label>
                <div
                  className={cn(
                    "rounded-lg border-2 bg-slate-50 p-2.5 font-semibold tabular-nums text-slate-900 shadow-inner",
                    timesLookInvalid ? "border-amber-400" : "border-slate-200",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>{endTime}</span>
                  </span>
                  <p className="mt-1 text-[10px] font-medium leading-snug text-slate-600">
                    Fixed {sessionDefaultDurationMinutes}-minute sessions (
                    <span className="font-semibold text-slate-800">Teaching Defaults</span>). Change duration under
                    Profile → Teaching Defaults.
                  </p>
                </div>
              </div>
            </div>
            {scheduleIssue ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950" role="status">
                {scheduleIssue}
              </p>
            ) : (
              <p className="text-xs font-medium text-slate-500">
                Start times use 15-minute steps and must fit before midnight. Length always matches your Teaching Default (
                {sessionDefaultDurationMinutes} min).
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">Price (CAD / session)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input 
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-300 bg-white p-2.5 pl-9 font-bold tabular-nums text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">Timezone</label>
                <div className="relative" ref={timezoneRef}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)}
                    className={cn(
                      "h-auto w-full justify-between rounded-lg border-2 border-slate-300 bg-white p-2.5 text-left font-semibold text-slate-900 shadow-sm hover:bg-slate-50",
                      isTimezoneDropdownOpen && "border-indigo-500 ring-2 ring-indigo-200"
                    )}
                  >
                    <span className="truncate text-xs">{timezone}</span>
                    <Globe className="ml-1 h-4 w-4 shrink-0 text-slate-600" />
                  </Button>
                  <AnimatePresence>
                    {isTimezoneDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full left-0 right-0 z-[100] mb-2 max-h-48 overflow-y-auto rounded-lg border-2 border-slate-300 bg-white shadow-xl"
                      >
                        {APP_TIMEZONES.map((tz) => (
                          <button
                            key={tz}
                            type="button"
                            onClick={() => { setTimezone(tz); setIsTimezoneDropdownOpen(false); }}
                            className={cn(
                              "w-full border-b border-slate-100 p-2 text-left text-xs font-medium transition-colors last:border-b-0",
                              tz === timezone ? "bg-indigo-100 text-indigo-950" : "bg-white text-slate-900 hover:bg-indigo-50"
                            )}
                          >
                            {tz}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recurring Toggle */}
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="mx-6 mb-6 rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Repeat weekly</p>
                <p className="text-xs font-medium text-slate-600">Keep these slots open for multiple weeks</p>
              </div>
              <button
                type="button"
                onClick={() => setRecurring(!recurring)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200",
                  recurring ? "border-indigo-800 bg-indigo-600" : "border-slate-300 bg-slate-200"
                )}
                aria-pressed={recurring}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full border border-slate-300 bg-white shadow transition-transform duration-200",
                  recurring ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>
            <AnimatePresence>
              {recurring && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Repeat for</span>
                    <input 
                      type="number" 
                      value={recurringWeeks}
                      onChange={(e) => setRecurringWeeks(e.target.value)}
                      className="w-16 rounded border-2 border-slate-300 bg-white p-1.5 text-center text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">weeks</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Error / success */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mx-6 mb-4 flex items-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
            {successMessage && !error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mx-6 mb-4 flex items-center gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950"
              >
                <Check className="h-4 w-4 shrink-0 stroke-[3]" />
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={shouldAnimate ? itemVariants : {}} className="border-t-2 border-slate-200 bg-slate-50/90 p-6">
            <Button
              type="button"
              onClick={handleNext}
              disabled={!hasCourses || weekdays.size === 0 || Boolean(scheduleIssue)}
              size="lg"
              className="h-12 w-full border-2 border-indigo-800 bg-indigo-600 text-base font-bold text-white shadow-md hover:bg-indigo-700 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
            >
              Preview &amp; create
            </Button>
            <p className="mt-2 text-center text-xs font-medium text-slate-600">
              Next step: review everything you chose, then confirm.
            </p>
          </motion.div>
        </motion.div>

        {/* Confirmation View */}
        <motion.div
          initial={false}
          animate={{ 
            y: showConfirmationView ? "0%" : "100%",
            opacity: showConfirmationView ? 1 : 0 
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          className={cn(
            "absolute left-0 top-0 z-[60] h-full w-full border-l-4 border-indigo-600 bg-white",
            showConfirmationView ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <div className="flex h-full flex-col space-y-6 p-6">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b-2 border-slate-200 pb-4">
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowConfirmationView(false);
                  setError(null);
                }} 
                className="justify-self-start flex items-center gap-2 border-2 border-slate-400 bg-white font-bold text-slate-900 shadow-sm hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">Back to edit</span>
              </Button>
              <h3 className="text-center text-lg font-bold tracking-tight text-slate-900">Review &amp; confirm</h3>
              <span className="justify-self-end" aria-hidden />
            </div>

            <div className="flex flex-1 flex-col space-y-4 overflow-y-auto pr-1">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">You selected</p>
              <div className="space-y-4 rounded-xl border-2 border-indigo-300 bg-indigo-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h4 className="text-xl font-extrabold tracking-tight text-slate-900">{course}</h4>
                  <div className="rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-right shadow-sm">
                    <p className="text-2xl font-black tabular-nums text-slate-900">${price}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">CAD / session</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-900">
                    <Clock className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span className="tabular-nums">{startTime} – {endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-900">
                    <Calendar className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span>{recurring ? `${recurringWeeks} weeks (recurring)` : "One week only"}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Days included</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.filter(d => weekdays.has(d.value)).map(d => (
                    <div
                      key={d.value}
                      className="flex items-center gap-2 rounded-full border-2 border-emerald-700 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-950"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-700" strokeWidth={3} />
                      {d.full}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-semibold leading-relaxed text-amber-950">
                  <span className="font-black uppercase tracking-wide text-amber-900">Timezone: </span>
                  {timezone}. Learners see these times converted to their own zone.
                </p>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || Boolean(scheduleIssue)}
              size="lg"
              className="h-14 w-full border-2 border-emerald-900 bg-emerald-600 text-base font-black uppercase tracking-wide text-white shadow-md hover:bg-emerald-700 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "Creating slots…" : "Confirm & create slots"}
                {!loading && <Check className="h-5 w-5 stroke-[3]" />}
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { ChevronLeft, Calendar, Clock, Check, AlertCircle } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { createAvailabilitySlots } from "@/features/tutor/availability";
import { useAdminViewContext } from "@/components/admin-view-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/shared/ui/button";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { MentrixaSelect, MentrixaTimezoneSelect } from "@/shared/ui/select-patterns";
import { BREAKTHROUGH_SESSION_PRICE_CAD, formatStudentBreakthroughPrice } from "@/features/booking/booking-pricing";
import { describeAvailabilityScheduleIssue } from "@/features/booking/availability-slot-builder";
import { addMinutesToHHmm } from "@/features/tutor/teaching-defaults";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { GUIDE_AVAILABILITY_FORM } from "@/features/tutor/guide-home-copy-pure";
import { APP_TIMEZONES } from "@/shared/core/timezones";

const WEEKDAYS: { value: number; label: string; full: string }[] = [
  { value: 0, label: "Mon", full: "Monday" },
  { value: 1, label: "Tue", full: "Tuesday" },
  { value: 2, label: "Wed", full: "Wednesday" },
  { value: 3, label: "Thu", full: "Thursday" },
  { value: 4, label: "Fri", full: "Friday" },
  { value: 5, label: "Sat", full: "Saturday" },
  { value: 6, label: "Sun", full: "Sunday" },
];

const ALL_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

const NATIVE_FIELD_CLASS =
  "w-full rounded-lg border-2 border-slate-300 bg-white p-2.5 font-semibold tabular-nums text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

interface CreateAvailabilityCardProps {
  apCalcVerified: boolean;
  defaultTimezone: string;
  sessionDefaultDurationMinutes: number;
  className?: string;
  enableAnimations?: boolean;
  onSlotsCreated?: () => void;
}

function Section({
  fast,
  className,
  children,
  variants,
}: {
  fast: boolean;
  className?: string;
  children: ReactNode;
  variants?: Variants;
}) {
  if (fast) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

export function CreateAvailabilityCard({
  apCalcVerified,
  defaultTimezone,
  sessionDefaultDurationMinutes,
  className,
  enableAnimations = true,
  onSlotsCreated,
}: CreateAvailabilityCardProps) {
  const skill = AP_CALC_AB_SUBJECT;
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState(() => addMinutesToHHmm("09:00", sessionDefaultDurationMinutes) ?? "10:00");
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState("12");
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [showConfirmationView, setShowConfirmationView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const router = useRouter();
  const { viewingAsUserId } = useAdminViewContext();
  const shouldReduceMotion = useReducedMotion();
  const fast = !enableAnimations || Boolean(shouldReduceMotion);
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const startTimeOptions = useMemo(
    () => ALL_TIMES.filter((t) => addMinutesToHHmm(t, sessionDefaultDurationMinutes) != null),
    [sessionDefaultDurationMinutes],
  );

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
      scheduleIssue.includes("exactly") ||
      scheduleIssue.includes("already in the past"));

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
    if (!apCalcVerified) {
      setError(GUIDE_AVAILABILITY_FORM.errVerify);
      return;
    }
    if (weekdays.size === 0) {
      setError(GUIDE_AVAILABILITY_FORM.errDays);
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

    const rw = Number.parseInt(recurringWeeks, 10);
    if (recurring && (!Number.isFinite(rw) || rw < 1 || rw > 52)) {
      setError(GUIDE_AVAILABILITY_FORM.errWeeks);
      setLoading(false);
      return;
    }

    const payload = {
      course: skill,
      weekdays: Array.from(weekdays).sort((a, b) => a - b),
      startTime,
      endTime,
      recurring,
      recurringWeeks: recurring ? rw : undefined,
      priceCad: BREAKTHROUGH_SESSION_PRICE_CAD,
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
      setWeekdays(new Set());
      setShowConfirmationView(false);
      setSuccessMessage(GUIDE_AVAILABILITY_FORM.success(n));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : GUIDE_AVAILABILITY_FORM.errCreate);
    } finally {
      setLoading(false);
    }
    if (created) {
      queueMicrotask(() => onSlotsCreated?.());
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -25, scale: 0.95, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 400, damping: 28, mass: 0.6 },
    },
  };

  const canCreateSlots = apCalcVerified;

  const startTimeField = fast ? (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">Start time</label>
      <select
        value={startTime}
        onChange={(e) => {
          setStartTime(e.target.value);
          setError(null);
          setSuccessMessage(null);
        }}
        className={cn(NATIVE_FIELD_CLASS, timesLookInvalid && "border-amber-500 ring-amber-200")}
      >
        {startTimeOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  ) : (
    <div>
      <MentrixaSelect
        label="Start time"
        brandKind="guide"
        value={startTime}
        onChange={(id) => {
          if (!id) return;
          setStartTime(id);
          setError(null);
          setSuccessMessage(null);
        }}
        options={startTimeOptions.map((t) => ({ id: t, label: t }))}
        triggerClassName={cn("font-semibold tabular-nums", timesLookInvalid && "border-amber-500 ring-amber-200")}
      />
    </div>
  );

  const timezoneField = fast ? (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
        {GUIDE_AVAILABILITY_FORM.timezoneLabel}
      </label>
      <select
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        className={NATIVE_FIELD_CLASS}
      >
        {APP_TIMEZONES.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  ) : (
    <MentrixaTimezoneSelect
      value={timezone}
      onChange={setTimezone}
      label={GUIDE_AVAILABILITY_FORM.timezoneLabel}
      brandKind="guide"
    />
  );

  const shellClassName = cn(
    "rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-xl shadow-slate-200/80 overflow-hidden max-w-2xl relative w-full",
    className,
  );

  const formBody = (
    <div className={cn("relative h-auto", shouldAnimate ? "min-h-[500px]" : "min-h-0")}>
      <div
        className={cn(
          "w-full",
          fast && showConfirmationView && "pointer-events-none opacity-30",
        )}
        aria-hidden={showConfirmationView}
      >
        <Section fast={fast} variants={shouldAnimate ? itemVariants : {}} className="p-6 pb-6 border-b-2 border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-indigo-200 bg-white shadow-sm">
              <Image src={MENTRIXA_LOGO_PNG} alt="Mentrixa" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{GUIDE_AVAILABILITY_FORM.title}</h2>
              <p className="text-sm font-medium text-slate-600">{GUIDE_AVAILABILITY_FORM.subtitle}</p>
            </div>
          </div>
        </Section>

        <Section fast={fast} variants={shouldAnimate ? itemVariants : {}} className="p-6 pb-4">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#334155]">
            {GUIDE_AVAILABILITY_FORM.skillLabel}
          </label>
          <div className="rounded-lg border-2 border-[#7C3AED]/30 bg-[#EDE9FE]/60 px-4 py-3">
            <p className="text-base font-bold text-[#0B1220]">{AP_CALC_AB_SUBJECT}</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-[#475569]">
              {apCalcVerified ? GUIDE_AVAILABILITY_FORM.verifiedNote : GUIDE_AVAILABILITY_FORM.unverifiedNote}
            </p>
          </div>
          {!apCalcVerified ? (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950" role="status">
              {GUIDE_AVAILABILITY_FORM.blockedNote}
            </p>
          ) : null}
        </Section>

        <Section fast={fast} variants={shouldAnimate ? itemVariants : {}} className="px-6 pb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-700">
            {GUIDE_AVAILABILITY_FORM.daysLabel}
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
                    "h-auto rounded-lg border-2 px-4 py-2.5 text-sm font-bold transition-colors duration-150",
                    isActive
                      ? "border-indigo-700 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600 ring-offset-2 ring-offset-white hover:bg-indigo-700"
                      : "border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50",
                  )}
                >
                  {d.label}
                </Button>
              );
            })}
          </div>
        </Section>

        <Section fast={fast} variants={shouldAnimate ? itemVariants : {}} className="space-y-4 px-6 pb-6">
          <div className="grid grid-cols-2 gap-4">
            {startTimeField}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                {GUIDE_AVAILABILITY_FORM.sessionEndLabel}
              </label>
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
                  {GUIDE_AVAILABILITY_FORM.durationNote(sessionDefaultDurationMinutes)}
                </p>
              </div>
            </div>
          </div>
          {scheduleIssue ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950" role="status">
              {scheduleIssue}
            </p>
          ) : (
            <p className="text-xs font-medium text-[#475569]">
              {GUIDE_AVAILABILITY_FORM.durationNote(sessionDefaultDurationMinutes)}
            </p>
          )}

          <div>{timezoneField}</div>
          <p className="text-xs font-medium text-[#475569]">{GUIDE_AVAILABILITY_FORM.fixedPriceNote}</p>
        </Section>

        <Section fast={fast} variants={shouldAnimate ? itemVariants : {}} className="mx-6 mb-6 rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">{GUIDE_AVAILABILITY_FORM.repeatTitle}</p>
              <p className="text-xs font-medium text-slate-600">{GUIDE_AVAILABILITY_FORM.repeatSub}</p>
            </div>
            <button
              type="button"
              onClick={() => setRecurring(!recurring)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-150",
                recurring ? "border-indigo-800 bg-indigo-600" : "border-slate-300 bg-slate-200",
              )}
              aria-pressed={recurring}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full border border-slate-300 bg-white shadow transition-transform duration-150",
                  recurring ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
          {recurring ? (
            <div className="mt-3 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{GUIDE_AVAILABILITY_FORM.repeatFor}</span>
                <input
                  type="number"
                  value={recurringWeeks}
                  onChange={(e) => setRecurringWeeks(e.target.value)}
                  className="w-16 rounded border-2 border-slate-300 bg-white p-1.5 text-center text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">{GUIDE_AVAILABILITY_FORM.weeks}</span>
              </div>
            </div>
          ) : null}
        </Section>

        {error ? (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        ) : null}
        {successMessage && !error ? (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">
            <Check className="h-4 w-4 shrink-0 stroke-[3]" />
            {successMessage}
          </div>
        ) : null}

        <Section fast={fast} variants={shouldAnimate ? itemVariants : {}} className="border-t-2 border-slate-200 bg-slate-50/90 p-6">
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canCreateSlots || weekdays.size === 0 || Boolean(scheduleIssue)}
            size="lg"
            className="h-12 w-full border-2 border-indigo-800 bg-indigo-600 text-base font-bold text-white shadow-md hover:bg-indigo-700 disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {GUIDE_AVAILABILITY_FORM.previewCta}
          </Button>
          <p className="mt-2 text-center text-xs font-medium text-slate-600">{GUIDE_AVAILABILITY_FORM.previewHint}</p>
        </Section>
      </div>

      <div
        className={cn(
          "absolute left-0 top-0 z-[60] h-full w-full border-l-4 border-indigo-600 bg-white transition-all duration-200",
          showConfirmationView ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none",
          fast && !showConfirmationView && "invisible",
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
              <span className="text-sm">{GUIDE_AVAILABILITY_FORM.backEdit}</span>
            </Button>
            <h3 className="text-center text-lg font-bold tracking-tight text-slate-900">{GUIDE_AVAILABILITY_FORM.reviewTitle}</h3>
            <span className="justify-self-end" aria-hidden />
          </div>

          <div className="flex flex-1 flex-col space-y-4 overflow-y-auto pr-1">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">{GUIDE_AVAILABILITY_FORM.youSelected}</p>
            <div className="space-y-4 rounded-xl border-2 border-indigo-300 bg-indigo-50 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h4 className="text-xl font-extrabold tracking-tight text-slate-900">{skill}</h4>
                <div className="rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-right shadow-sm">
                  <p className="text-2xl font-black tabular-nums text-slate-900">{formatStudentBreakthroughPrice()}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">CAD / session</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-900">
                  <Clock className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span className="tabular-nums">
                    {startTime} – {endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-900">
                  <Calendar className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span>{recurring ? GUIDE_AVAILABILITY_FORM.recurringWeeks(recurringWeeks) : GUIDE_AVAILABILITY_FORM.oneWeek}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">{GUIDE_AVAILABILITY_FORM.daysIncluded}</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.filter((d) => weekdays.has(d.value)).map((d) => (
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
                {GUIDE_AVAILABILITY_FORM.timezoneNote(timezone)}
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
              {loading ? GUIDE_AVAILABILITY_FORM.creating : GUIDE_AVAILABILITY_FORM.confirmCta}
              {!loading && <Check className="h-5 w-5 stroke-[3]" />}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );

  if (fast) {
    return <div className={shellClassName}>{formBody}</div>;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={shellClassName}
    >
      {formBody}
    </motion.div>
  );
}
